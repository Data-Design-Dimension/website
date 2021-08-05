from flask import Flask
app= Flask(__name__)

@app.route("/")
def dadeda():
    return "Data Design Dimension"

if __name__=="__main__":
    app.run(debug= True)