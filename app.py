from flask import Flask, render_template
app= Flask(__name__)

@app.route("/")
def home():
   return render_template("home.html")

@app.route("/work")
def work():
   return render_template("work.html")

@app.route("/invest-as-one")
def invest_as_one():
   return render_template("invest-as-one.html")

@app.route("/freedom-map")
def freedom_map():
   return render_template("freedom-map.html")

@app.route("/about")
def about():
   return render_template("about.html", my_string="data writing, products, and solutions.", my_list1=['Data science blogs'], my_list2=['Data visualization tutorials'], my_list3=['Visual communications'], my_list4=['Analytic web applications'], my_list5=['Maps'], my_list6=['Interactive charts'])

@app.route("/contact")
def contact():
   return render_template("contact.html")   

@app.route("/benefit")
def benefit():
   return render_template("benefit.html", my_string="public benefit created.")

if __name__=="__main__":
    app.run(debug= True)