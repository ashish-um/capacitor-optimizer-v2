document.getElementById('optimizer-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent the default form submission

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Finding configuration...'; // Clear previous result and show loading

    const target = parseFloat(document.getElementById('target').value);
    const branches = parseInt(document.getElementById('branches').value, 10); // Use radix 10
    const fixed = parseFloat(document.getElementById('fixed').value);
    const max_parallel = parseInt(document.getElementById('max_parallel').value, 10); // Use radix 10
    const availableInput = document.getElementById('available').value;

    // Convert available capacitors from comma-separated string to array of floats
    const available = availableInput.split(',')
        .map(val => parseFloat(val.trim()))
        .filter(val => !isNaN(val)); // Filter out any results that couldn't be parsed as numbers

    // Basic client-side validation
    if (isNaN(target) || isNaN(branches) || isNaN(fixed) || isNaN(max_parallel) || available.length === 0 || available.some(isNaN)) {
        resultDiv.innerHTML = '<span class="error">Error: Please fill in all fields with valid numbers/list.</span>';
        return;
    }
    if (branches <= 0) {
         resultDiv.innerHTML = '<span class="error">Error: Number of branches must be positive.</span>';
         return;
    }
     if (max_parallel < 0) {
         resultDiv.innerHTML = '<span class="error">Error: Max parallel capacitors cannot be negative.</span>';
         return;
     }
     if (fixed <= 0 || available.some(val => val <= 0)) {
          resultDiv.innerHTML = '<span class="error">Error: Capacitor values (fixed and available) must be positive.</span>';
          return;
     }


    try {
        const response = await fetch('http://127.0.0.1:8000/find_config', { // Update URL if your server is elsewhere
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ target, branches, fixed, max_parallel, available })
        });

        // Check if the response status is OK (200-299) before parsing JSON
        if (!response.ok) {
             const errorText = await response.text(); // Get raw text for potential error details
             throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }


        const result = await response.json(); // Parse the JSON response body

        // Check the status field from the JSON response
        if (result.status === 'success') {
            let htmlOutput = '<h2>Optimal Configuration Found</h2>';

            // Overall Results
            htmlOutput += `<p><strong>Target Capacitance:</strong> ${result.target_capacitance.toFixed(3)} F</p>`;
            htmlOutput += `<p><strong>Achieved Capacitance:</strong> ${result.achieved_capacitance.toFixed(4)} F</p>`;

            // Format absolute difference (use scientific notation for very small numbers)
            const diff = result.absolute_difference;
            if (diff < 1e-6 && diff > 0) { // Check if very small positive number
                 htmlOutput += `<p><strong>Absolute Difference:</strong> ${diff.toExponential(6)} F</p>`;
            } else {
                 htmlOutput += `<p><strong>Absolute Difference:</strong> ${diff.toFixed(6)} F</p>`;
            }


            htmlOutput += '<h3>Configuration Details per Branch:</h3>';

            // Branch Details (iterate through the 'branches' array)
            result.branches.forEach((branch, index) => {
                htmlOutput += `<h4>Branch ${index + 1}:</h4>`;
                htmlOutput += `<p><strong>Fixed Cap:</strong> ${branch.c_fixed.toFixed(2)} F</p>`;
                htmlOutput += `<p><strong>Parallel Group (Total caps: ${branch.total_parallel_caps_in_group}):</strong></p><ul>`;

                // Parallel Group Counts (iterate through keys in parallel_group_counts object)
                const parallelCounts = branch.parallel_group_counts;
                const capNames = Object.keys(parallelCounts); // Get an array of the names ("5F", "10F", etc.)

                let anyCapsAdded = false;
                capNames.forEach(capName => {
                    const count = parallelCounts[capName];
                    if (count > 0) { // Only show capacitor types that are actually used
                         htmlOutput += `<li>${capName}: ${count}</li>`;
                         anyCapsAdded = true;
                    }
                });
                 if (!anyCapsAdded) {
                      htmlOutput += `<li>None added</li>`;
                 }
                htmlOutput += `</ul>`;

                htmlOutput += `<p><strong>Parallel Group C:</strong> ${branch.c_parallel_group.toFixed(2)} F</p>`;
                htmlOutput += `<p><strong>Total Branch C:</strong> ${branch.c_branch_total.toFixed(2)} F</p>`;
            });

            // Optional: Add raw JSON for debugging
            // htmlOutput += '<h3>Raw JSON Response:</h3><pre>' + JSON.stringify(result, null, 2) + '</pre>';

            resultDiv.innerHTML = htmlOutput; // Display the formatted HTML

        } else if (result.status === 'error') {
            // Handle error status from the server
            resultDiv.innerHTML = `<span class="error">Error from server: ${result.message}</span>`;
        } else {
            // Handle unexpected status
             resultDiv.innerHTML = `<span class="error">Error: Unexpected response status '${result.status}' from server.</span>`;
             console.error("Unexpected server response:", result); // Log the unexpected response
        }

    } catch (error) {
        // Handle network errors, HTTP errors (from response.ok check), JSON parsing errors, etc.
        resultDiv.innerHTML = '<span class="error">Error fetching data: ' + error.message + '</span>'; // Use error.message
        console.error("Fetch or JSON parsing error:", error);
    }
});