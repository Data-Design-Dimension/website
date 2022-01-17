from flask import Flask, render_template
app= Flask(__name__)

@app.route("/")
def home():
   return render_template("home.html")

@app.route("/work")
def work():
   return render_template("work.html")

@app.route("/about")
def about():
   return render_template("about.html", my_string="compel action with data backed visual storytelling.", my_list1=['Web applications'], my_list2=['Interactive and static charts'], my_list3=['Maps'])

@app.route("/contact")
def contact():
   return render_template("contact.html")   

@app.route("/benefit")
def benefit():
   return render_template("benefit.html", my_string="public benefit created.")

@app.route("/benefit_report_2020")
def benefit_report_2020():
   return render_template("15-8898_Benefit_LLC_Annual_Report_2020.html")

@app.route("/benefit_report_2021")
def benefit_report_2021():
   return render_template("15-8898_Benefit_LLC_Annual_Report_2021.html")

if __name__=="__main__":
    app.run(debug= True)