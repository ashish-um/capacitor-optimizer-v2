# Trying to achieve:-
<img src="https://github.com/user-attachments/assets/4aa63475-bee4-4535-a4ea-0d8af4dcd757" alt="drawing" width="700"/>

## version 1
uses webassembly to run the cpp code in browser  
v1 prototype:-
https://ashish-um.github.io/capacitor-optimizer/

## version 2:
running cpp on bare metal, utilizing all cpu cores for faster performance,
converting cpp response to json output and parsing it in fastapi and client side  
> (cpp on bare metal) <----> [ fastapi ] <----> (client)

### Setup:

```
git clone https://github.com/ashish-um/capacitor-optimizer-v2.git
cd capacitor-optimizer-v2
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pydantic
```

Running fastapi server:
```
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Open index.html with live server and enjoy!!
