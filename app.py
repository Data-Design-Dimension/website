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
   return render_template("about.html", my_string="visual data science.", my_list1=['Blogs & talks'], my_list2=['Dataviz teaching'], my_list3=['Compelling communication'], my_list4=['Analytic apps'], my_list5=['Maps & time'], my_list6=['Interactive charts'])

@app.route("/contact")
def contact():
   return render_template("contact.html")   

@app.route("/benefit")
def benefit():
   return render_template("benefit.html", my_string="public benefit created.")

if __name__=="__main__":
    app.run(debug=False)