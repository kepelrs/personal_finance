#!/usr/bin/python3
from flask import Flask, request, render_template, redirect, jsonify
from database_model import *
from call_counter import count_calls, call_counter
import logging

# setup Flask app
app = Flask(__name__)


# Ensure responses aren't cached. Useful for when still building your front end
# You can delete this block of code later
@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


@app.before_request
def before_request():
    initialize_db()


@app.teardown_request
def teardown_request(exception):
    db.close()


@app.route("/")
@count_calls
def home():
    return render_template("index.html")


@app.route("/getlogs", methods=["POST"])
@count_calls
def getlogs():
    ''' this func should get a user and session key, and returns
        the latest 50 logs '''
    response_val = DBHandler.checkAuthentication(request)

    if not response_val:
        return jsonify({"response": "fail"})

    # load logs into an array (every log is a dict)
    user = request.form["user"]
    movs = DBHandler.get_latest_log(user, 50)
    balance = [DBHandler.get_balance(user)]
    logs = balance + movs

    # strip unnecessary data
    for item in logs:
        if "deleted" in item:
            del item["deleted"]
        if "user" in item:
            del item["user"]
        if "income" not in item:
            item["income"] = "Total"
        if "comments" not in item:
            item["comments"] = ""
        item["datetime"] = str(item["datetime"])[:-7]

    # send them back with response success and content string
    return jsonify({"response": "success",
                    "content": logs,
                    "val": response_val})

    # future: make this smart and only send bigger ids than the on
    # already being displayed


@app.route("/register", methods=["POST"])
@count_calls
def register():
    ''' check username alphanum, make sure username doesn't exist,
        and create new user '''
    user = request.form["username"][:20].lower()
    pwd = request.form["psw"][:100]
    ip = request.remote_addr[:20]

    success = DBHandler.add_user(user, pwd, ip)
    response = {"val": success}
    if success:
        response["response"] = "success"
        response["redirect"] = "personal_plan"
        response["serverMessage"] = "Logged in as " + success.split()[0]
        response["serverMessage"] += "<br><em>redirecting in a few seconds</em>"
    else:
        response["response"] = "fail"
        response["redirect"] = "register_login"
        response["serverMessage"] = "Username already in use."
        response["serverMessage"] += "<br><em>redirecting in a few seconds</em>"
    return jsonify(response)


@app.route("/login", methods=["POST"])
@count_calls
def login():
    ''' login user '''
    user = request.form["username"][:20].lower()
    pwd = request.form["psw"][:100]
    ip = request.remote_addr[:20]

    success = DBHandler.login_user(user, pwd, ip)
    response = {"val": success}
    if success:
        response["response"] = "success"
        response["redirect"] = "tracker"
        response["serverMessage"] = "Logged in as " + success.split()[0]
        response["serverMessage"] += "<br><em>redirecting in a few seconds</em>"
    else:
        response["response"] = "fail"
        response["redirect"] = "register_login"
        response["serverMessage"] = "Username and password don't match."
        response["serverMessage"] += "<br><em>redirecting in a few seconds</em>"
    return jsonify(response)


@app.route("/logout", methods=["POST"])
@count_calls
def logout():
    user = request.form["content"].split()[0]
    DBHandler.logout(user)
    return jsonify({"response": "success",
                    "val": ""})


@app.route("/addlog", methods=["POST"])
@count_calls
def addlog():
    response_val = DBHandler.checkAuthentication(request)

    if not response_val:
        return jsonify({"response": "fail",
                        "val": ""})

    user = request.form["user"][:20]
    incomeType = request.form["incomeType"][:20]
    incomeAmt = request.form["incomeAmt"][:20]
    expenseType = request.form["expenseType"][:20]
    expenseAmt = request.form["expenseAmt"][:20]
    comments = request.form["comments"][:200]

    if incomeAmt:
        divided_income = DBHandler.divideIncome(user, incomeAmt, incomeType)
        DBHandler.add_log(*([user] + divided_income + [comments]))
        DBHandler.update_balance(*([user] + divided_income + [comments]))

    if expenseAmt:
        divided_expense = DBHandler.divideExpense(expenseType, expenseAmt)
        DBHandler.add_log(*([user] + divided_expense + [comments]))
        DBHandler.update_balance(*([user] + divided_expense + [comments]))

    return jsonify({"response": "success",
                    "val": response_val})


@app.route("/savesettings", methods=["POST"])
@count_calls
def savesettings():
    response_val = DBHandler.checkAuthentication(request)

    if not response_val:
        return jsonify({"response": "fail",
                        "val": response_val})
    else:
        target = User.get(User.user == request.form["user"])
        target.expenses_scheme = request.form["settings"][:200]
        target.save()
        return jsonify({"response": "success",
                        "val": response_val})


@app.route("/loadsettings", methods=["POST"])
@count_calls
def loadsettings():
    response_val = DBHandler.checkAuthentication(request)

    if not response_val:
        return jsonify({"response": "fail",
                        "val": response_val})
    else:
        settings = User.get(User.user == request.form["user"]).expenses_scheme
        return jsonify({"response": "success",
                        "val": response_val,
                        "content": settings})


@app.errorhandler(404)
@count_calls
def page_not_found(e):
    return redirect('/')


if __name__ == "__main__":
    logger = logging.getLogger('werkzeug')
    handler = logging.FileHandler('access.log')
    logger.addHandler(handler)
    app.logger.addHandler(handler)
    app.run(host="0.0.0.0", port=3126, threaded=True, debug=False)
