from peewee import *
from playhouse.shortcuts import model_to_dict as mtd
import datetime
from random import choice


db = SqliteDatabase('user_tracker.db')
letters = "abcdefghijklmnopqrstuvwxyz"
keyVals = letters + letters.upper() + "0123456789"


class Log(Model):

    id = PrimaryKeyField()
    user = CharField()
    income = FloatField()
    rent = FloatField(default=0)
    bills = FloatField(default=0)
    food = FloatField(default=0)
    fun = FloatField(default=0)
    monthly_misc = FloatField(default=0)
    emergency_fund = FloatField(default=0)
    savings = FloatField(default=0)
    comments = TextField(default='')
    datetime = DateTimeField(default=datetime.datetime.now)
    deleted = BooleanField(default=False)

    class Meta:
        database = db


class User(Model):

    id = PrimaryKeyField()
    user = CharField()
    password = CharField()
    current_key = CharField(default="")
    create_date = DateTimeField(default=datetime.datetime.now)
    last_login = DateTimeField(default=datetime.datetime.now)
    session_ip = CharField(default="")
    expenses_scheme = CharField(default="10,10,10,10,10,10,40,30,0,0")
    request_count = IntegerField(default=0)

    class Meta:
        database = db


class Balance(Model):

    id = PrimaryKeyField()
    user = CharField()
    rent = FloatField(default=0)
    bills = FloatField(default=0)
    food = FloatField(default=0)
    fun = FloatField(default=0)
    monthly_misc = FloatField(default=0)
    emergency_fund = FloatField(default=0)
    savings = FloatField(default=0)
    datetime = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = db


class DBHandler():
    ''' this class contains the utility functions that the web page might
        request '''

    def update_balance(user, income, rent, bills, food, fun, monthly_misc,
                       emergency_fund, savings, comments):
        target = Balance.get(Balance.user == user)

        target.rent = round(rent + target.rent, 2)
        target.bills = round(target.bills + bills, 2)
        target.food = round(target.food + food, 2)
        target.fun = round(target.fun + fun, 2)
        target.monthly_misc = round(target.monthly_misc + monthly_misc, 2)
        target.emergency_fund = round(target.emergency_fund + emergency_fund, 2)
        target.savings = round(target.savings + savings, 2)
        target.datetime = datetime.datetime.now()
        target.save()

    def add_log(user, income, rent, bills, food, fun, monthly_misc,
                emergency_fund, savings, comments):
        ''' adds log to database '''
        Log.create(user=user, income=income, rent=rent, bills=bills, food=food,
                   fun=fun, monthly_misc=monthly_misc,
                   emergency_fund=emergency_fund, savings=savings,
                   comments=comments)

    def delete_log(id):
        ''' sets deleted parameter to True, and adds datetime to comments '''
        target = Log.get(Log.id == id)
        target.deleted = True
        target.comments += "\ndeleted on: "
        target.comments += str(datetime.datetime.now())
        target.save()

    def get_latest_log(user, n):
        ''' returns the n most recent logs '''
        select = Log.select().where(Log.user == user).where(Log.deleted == False)
        select = select.order_by(Log.id.desc())
        instances = [mtd(i) for i in select[-n:]]
        return instances

    def get_balance(user):
        return mtd(Balance.get(Balance.user == user))

    def add_user(username, password, ip):
        ''' create new user '''
        selection = User.select().where(User.user == username)

        if len(selection) == 0:
            User.create(user=username, password=password)
            Balance.create(user=username)
            return DBHandler.login_user(username, password, ip)
        else:
            return ""

    def login_user(user, pwd, ip):
        ''' store session ip and generate new key
            returns "username key" when successful,
            or empty string if fails'''
        selection = User.select().where(
            (User.user == user) & (User.password == pwd))

        if len(selection) == 1:
            target = selection[0]
            target.session_ip = ip
            target.last_login = datetime.datetime.now()
            DBHandler.updateKey(target)
            return user + " " + target.current_key
        else:
            return ""

    def updateKey(target):
        ''' handle current session key and session ip for logged in users '''
        target.current_key = "".join((choice(keyVals) for i in range(20)))
        target.request_count += 1
        target.save()

    def logout(user):
        target = User.get(User.user == user)
        target.session_ip = ""
        DBHandler.updateKey(target)

    def checkAuthentication(request):
        ''' checks if user + key returns ONE match from database '''
        user = request.form["user"]
        key = request.form["k"]
        ip = request.remote_addr

        target = User.get(User.user == user)
        if target.current_key == key and target.session_ip == ip:
            DBHandler.updateKey(target)
            return user + " " + target.current_key
        else:
            return ""

    def divideIncome(user, incomeAmt, incomeType):
        pctgs = User.get(User.user == user).expenses_scheme.split(",")[:-3]
        pctgs = [int(i) for i in pctgs]
        if incomeType != "regular":
            for i in range(3):
                pctgs[i] = 0
        income = float(incomeAmt)

        divided_values = [income]
        divided_values += [round(income * (i / sum(pctgs)), 2) for i in pctgs]
        return divided_values

    def divideExpense(expenseType, expenseAmt):
        income = -float(expenseAmt)
        cat = ["Rent",
               "Bills",
               "Food",
               "Fun",
               "Monthly Misc.",
               "Emergency Fund",
               "Savings"]

        values = [income]
        for i in cat:
            if i == expenseType:
                values.append(-float(expenseAmt))
            else:
                values.append(0)

        return values


def initialize_db():
    db.connect()
    db.create_tables([Log, User, Balance], safe=True)
