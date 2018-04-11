var categories = ["Income",
                  "Rent",
                  "Bills",
                  "Food",
                  "Fun",
                  "Monthly Misc.",
                  "Emergency Fund",
                  "Savings"];

var navBarItems =["personal_plan",
                  "tracker",
                  "home",
                  "register_login",
                  "about",
                  "server_message"];

var personalPlanClasses = ["rent",
                           "bills",
                           "food",
                           "fun",
                           "misc",
                           "emgcy",
                           "savings"];

function createPersonalTable(array){
    var pctgSelect, rawNumsInput, pctgs, rawNums, tdPctg, tdRaw;
    pctgs = $("<tr></tr>");
    rawNums = $("<tr></tr>");

    $.each(array, function(index, val){
        pctgSelect = $("<select></select>").addClass("selectPctg").addClass(val);
        tdPctg = $("<td></td>").append(pctgSelect);
        $(pctgs).append(tdPctg);

        rawNumsInput = $("<input></input>").addClass("rawNum").addClass(val);
        rawNumsInput.attr("placeholder", "$0").attr("type", "number");
        tdRaw = $("<td></td>").append(rawNumsInput);
        $(rawNums).append(tdRaw);
    });
    $("#regExpenses tbody").prepend(rawNums).prepend(pctgs);
}

function populatePctgs(increments) {
    $(".selectPctg").each(function(){
        for (i=100;i>=0;i-=increments){
            $(this).append($('<option></option>').val(i).html(i + "%"));
        }

        $(this).on("change", function(event){
            updateTotalPctg();
            updateRawNums(event);
            calculateRetirement();
        });
        $(this).val(10);
    });
    $(".savings.selectPctg").val(40);
}

function updateTotalPctg() {
    var totalPct = 0;
    $(".selectPctg").each(function(){
        totalPct += Number($(this).val());
        });

    var pctTrackerElem = $("#total_pct");
    pctTrackerElem.text(totalPct + "%");
    if(totalPct > 100){
        pctTrackerElem.css("color", "red");
    } else if (totalPct < 100) {
        pctTrackerElem.css("color", "orange");
    } else {
        pctTrackerElem.css("color", "#55979a");
    }
}

function trackerCategories() {
    logsHead = $("#logCats");
    selectCtgry = $(".selectCtgry");
    for(var i = 0; i < categories.length; i++){
        logsHead.append("<th>" + categories[i] + "</th>");
        selectCtgry.append($("<option></option>").val(categories[i]).html(categories[i]));
    }
    logsHead.append("<th>Comments</th>");
    logsHead.prepend("<th>Datetime</th>");
}

function updateRawNums(event){
    var fields = ["rent", "bills", "food", "fun", "misc", "emgcy", "savings"];
    var i, newTotal;

    if($(event.target).hasClass("total")){
        for(i=0; i < fields.length; i++){
            newTotal = Number($("."+fields[i]).val());
            newTotal *= Number($(".rawNum.total").val())/100;
            newTotal = Math.round(newTotal);


            if(newTotal === 0) {
                $("."+fields[i]+".rawNum").val("");
            }
            else {
                $("."+fields[i]+".rawNum").val(newTotal);
            }
        }
        return;
    } else {
        for(i=0; i < fields.length; i++){
            if($(event.target).hasClass(fields[i])) {
                newTotal = Number($(event.target).val());
                newTotal *= Number($(".rawNum.total").val())/100;
                newTotal = Math.round(newTotal);

                if(newTotal === 0) {
                    $("."+fields[i]+".rawNum").val("");
                }
                else {
                    $("."+fields[i]+".rawNum").val(newTotal);
                }
                break;
            }
        }
    }
}

function listenIncomeChanges(){
    $(".rawNum.total").on("keyup", function(event){
        updateRawNums(event);
    });
}

function calculatorRawNumListener() {
    var selections = $(".personal_plan .rawNum");
    selections.each(function() {
        $(this).on("change", function(event){
            var targetClass = $(event.target).attr("class").split(' ')[1];
            var totalIncome = Number($(".rawNum.total").val());
            var pctgUpdated = Math.round(($(event.target).val() / totalIncome) * 100);
            // handle pctg bigger than 100 or smaller than 0
            pctgUpdated = (pctgUpdated > 100 ? 100 : pctgUpdated < 0 ? 0 : pctgUpdated);
            var targetPctg = $(".selectPctg." + targetClass);
            targetPctg.val(pctgUpdated);
            targetPctg.trigger("change");
            //add handler for values bigger than 100 or smaller 0
        });
    });
}

function refreshButtonSetup() {
    $("#refresh").on("click", function() {
        sendForm = getSession();
        if (sendForm.user === "") {
            alert("Must be logged in to load.");
            return;
        }

        $.post("/getlogs", sendForm, function(data) {
            if(data.response=="success"){
                var sequence, target;
                $("#logTable").html("");
                $("#balances").html("");
                $.each(data.content, function(index, log) {
                    sequence = ["id",
                                "datetime",
                                "income",
                                "rent",
                                "bills",
                                "food",
                                "fun",
                                "monthly_misc",
                                "emergency_fund",
                                "savings",
                                "comments"];

                    if (index == 0){
                        target = $("#balances");
                        sequence.shift();
                    } else {
                        if (sequence[0] != "id"){
                            sequence.unshift("id");
                        }

                        $("#logTable").append('<tr id="logId' + log[sequence.shift()] + '"></tr>');
                        target = $("#logTable tr").last();
                    }

                    if(log.deleted == true) {
                        target.toggleClass("paidLoan");
                    } else if(Number(log.income) > 0){
                        target.toggleClass("positiveIncome");
                    } else if (Number(log.income) < 0) {
                        target.toggleClass("negativeIncome");
                    }

                    $.each(sequence, function(key, val) {
                        if(val == "datetime") {
                            target.append("<td class='datetime'>" + log[sequence.shift()] + "</td>");
                        } else {
                            target.append("<td>" + log[sequence.shift()] + "</td>");
                        }
                    });
                });
            $("#usr").html(data.val);
            } else {
                alert("Error getting log");
                $("#usr").html("").trigger("change");
            }
        });
    });
}

function registerButton() {
    $("#register button").on("click", function(e){
        e.preventDefault();
        if($("#regpwd1").val() != $("#regpwd2").val()) {
            alert("Registration passwords don't match");
            return;
        }

        var form = {
            username: $("#regusr").val(),
            psw: $.sha256($("#regpwd1").val())
        };
        $("#regusr").val("");
        $("#regpwd1").val("");
        $("#regpwd2").val("");

        $.post("/register", form, function(data) {
            data.redirect = "a." + data.redirect;

            if(data.response === "success") {
                displayServerMessage(data.serverMessage);
                setTimeout(function(){
                    $(data.redirect).trigger("click");
                }, 3000);
                var logout = $("a.register_login").html("Logout");
                logout.on("click", logoutButton);
            } else {
                displayServerMessage(data.serverMessage);
                setTimeout(function(){
                    $(data.redirect).trigger("click");
                }, 3000);
            }
            $("#usr").html(data.val);
        });
    });
}

function loginButton() {
    $("#login button").on("click", function(e){
        e.preventDefault();
        var form = {
            username: $("#loginusr").val(),
            psw: $.sha256($("#loginpwd").val())
        };

        $("#loginusr").val("");
        $("#loginpwd").val("");
        $.post("/login", form, function(data) {
            data.redirect = "a." + data.redirect;

            if(data.response === "success") {
                displayServerMessage(data.serverMessage);
                setTimeout(function(){
                    $(data.redirect).trigger("click");
                }, 3000);
                var logout = $("a.register_login").html("Logout");
                logout.unbind();
                logout.on("click", logoutButton);
                $("#usr").html(data.val);
                $("#reloadPlan").trigger("click");
            } else {
                displayServerMessage(data.serverMessage);
                setTimeout(function(){
                    $(data.redirect).trigger("click");
                }, 3000);
                $("#usr").html(data.val);
            }
            forCouples();
        });
    });
}

function logoutButton() {
    $.post("/logout", {content: $("#usr").html()}, function(data) {
        if (data.response === "success") {
            var login = $("a.register_login").html("Register/Login");
            login.unbind();
            setupNavBar(["register_login"]);
            $("#usr").html("").trigger("change");
            displayServerMessage("You are logged out.");
            setTimeout(function(){
                $("a.home").trigger("click");
            }, 3000);
        } else {
            displayServerMessage("Something went wrong with your logout.");
            setTimeout(function(){
                $("a.home").trigger("click");
            }, 3000);
        }
    });
}

function hideAllDivs() {
    $.each(navBarItems, function(i, val) {
        $("div."+val).css("display", "none");
    });
}

function displayTargetDiv(e) {
    $($(e.target).attr("class").split(" ")).each(function(i, val){
        if (navBarItems.indexOf(val) >= 0){
            $("div."+val).fadeIn();

            if (val == 'tracker') {
                // link table header and second table, after table1 is fully filled.
                var table1 = document.querySelectorAll('#logs table')[0];
                var table2 = document.querySelectorAll('#logs table')[1];
                linkTwoTableColWidths(table1, table2);
            }
        }
    });
}

function activateNavButton(e) {
    $(".navbar-container a").each(function(i, val){
        if ($(val).hasClass("active")){
            $(val).toggleClass("active");
        }
    });
    $(e.target).toggleClass("active");
}

function setupNavBar (array) {
    $.each(array, function(i, val){
        $("a."+val).on("click", function(e) {
        e.preventDefault();
        hideAllDivs();
        displayTargetDiv(e);
        activateNavButton(e);
        });
    });
}

function displayServerMessage(msg){
    hideAllDivs();
    serverMessage = $(".server_message");
    serverMessage.html(msg);
    serverMessage.toggleClass("hidden_div");
}

function saveSetup(){
    $("#savePlan").on("click", function() {
        if(Number($("#total_pct").html().slice(0,-1)) != 100) {
            alert("Total percentage must add up to 100%!");
        } else if (getSession().user === "") {
            alert("Must be logged in to save.");
        } else {
            var form = getSession();
            form.settings = "";
            $.each($(".selectPctg"), function(i,item){
                form.settings += String($(item).val()) + ",";
            });
            form.settings += $("#yourAge").val();
            form.settings += ",";
            form.settings += $(".rawNum.total").val();
            form.settings += ",";
            form.settings += $("#startingSavings").val();



            $.post("/savesettings", form, function(data){
                if (data.response === "success"){
                    alert("New settings saved");
                } else {
                    alert("Some error saving settings");
                }
                $("#usr").html(data.val);
            });
        }
    });
}

function reloadPlan(){
    $("#reloadPlan").on("click", function() {
        if (getSession().user === "") {
            alert("Must be logged in to load.");
        } else {
            var form = getSession();

            $.post("/loadsettings", form, function(data){
                if (data.response === "success"){
                    var responseArray = data.content.split(",");
                    var targetFields = $(".selectPctg").add("#yourAge")
                        .add(".rawNum.total").add("#startingSavings");

                    targetFields.each(function(i, item){
                        $(item).val(responseArray.shift()).trigger("change");
                    });
                    $("#usr").html(data.val);
                    $("#refresh").trigger("click");
                    $(".rawNum.total").trigger("keyup");
                } else {
                    alert("Some error saving settings");
                    $("#usr").html("").trigger("change");
                }
            });
        }
    });
}

function getSession () {
    var usr, k, user, sendForm;
    usr = $("#usr").html().split(" ");
    user = usr[0];
    k = usr[1];
    sendForm = {
        user: user,
        key: k,
        k: k
    };

    return sendForm;
}

function sendLog() {
    $("#submitLogs").on("click", function(){
        var form = getSession();
        if (form.user === "") {
            alert("Must be logged in to save.");
            return;
        }

        form.incomeType = $("#incomeType").val();
        form.incomeAmt = $("#incomeTracker").val();
        form.expenseType = $("#expenseType").val();
        form.expenseAmt = $("#expensesTracker").val();
        form.comments = scanIfPayingLoan();

        $.post("/addlog", form, function(data){
            if(data.response === "success"){
                $("#usr").html(data.val);
                $("#refresh").trigger("click");
            } else {
                alert("Something went wrong.\nLog not saved");
                $("#usr").html("").trigger("change");
            }
        });
        $("#resetAll").trigger("click");
    });
}

function scanIfPayingLoan() {
    var datetime_array, comment, date, logId;
    commentField = $("#trackerComments");
    currentComment = commentField.val().trim();

    $(".datetime").each(function (index, val) {
        date = $(val);
        if(date.html() == currentComment) {
            logId = date.parent().attr('id');
            commentField.val(logId);
        }
    });

    return commentField.val();
}

function resetAll() {
    $("#resetAll").on("click", function(){
        $("input").each(function(index, item){
            $(item).val("");
        });
        $("textarea").each(function(index, item){
            $(item).val("");
        });
    });

    $("#usr").on("change", function(){
        if ($("#usr").html() === "") {
            alert("You have been logged out.");
            location.reload();
        } else {
            $("input").each(function(index, item){
                $(item).val("");
            });
            $("textarea").each(function(index, item){
                $(item).val("");
            });
        }
    });
}

function setAboutWidth(){
    var width = $(".navbar-container").width();
    $("div.about").css("width", width);
    $("div.home").css("width", width);
}

function setupYourAgeSelection(){
    for(var i=99; i>17; i--){
        $("#yourAge").append($("<option></option>").val(i).html(i));
    }
    $("#yourAge").val(30);
}

function calculateRetirement() {
    var monthlyCost, monthlyIncome, yearCounter, savings,
    targetSavings, savingRate;

    savingRate = Number($(".selectPctg.savings").val())/100;
    if (savingRate === 0){
        $("#retireAge").html("--");
        return;
    }

    if ($("#startingSavings").val() != "") {
        savings = Number($("#startingSavings").val());
    } else {
        savings = 0;
    }

    if ($(".rawNum.total").val() != "") {
        monthlyIncome = Number($(".rawNum.total").val());
    } else {
        monthlyIncome = 1;
    }

    monthlyCost = monthlyIncome * (1 - (savingRate));
    targetSavings = monthlyCost * 12 * 20;
    yearCounter = 0;

    while(savings < targetSavings){
        yearCounter += 1;
        savings = savings * 1.05 + monthlyIncome * savingRate * 12;
    }

    $("#retireAge").html(yearCounter + Number($("#yourAge").val()));
}

function calculateRetirementAdditionalTriggers(){
    calculateRetirement();

    $("#startingSavings").on("keyup", function(event){
        calculateRetirement();
    });

    $("#yourAge").on("change", function(event){
        calculateRetirement();
    });
}

function forCouples(){
    if($("#usr").html().split(" ")[0] == "carol"){
        var alternativeValues = ["Rent & Bills", "Misc", "Mutual Fun", "Carol Fun", "Davi Fun"];
        $("#personalPlanRent").html(alternativeValues[0]);
        $("#personalPlanBills").html(alternativeValues[1]);
        $("#personalPlanFun").html(alternativeValues[2]);
        $("#personalPlanMisc").html(alternativeValues[3]);
        $("#personalPlanEmgcy").html(alternativeValues[4]);


        var trackerHeaders = $("#logCats").children();
        $(trackerHeaders[2]).html(alternativeValues[0]);
        $(trackerHeaders[3]).html(alternativeValues[1]);
        $(trackerHeaders[5]).html(alternativeValues[2]);
        $(trackerHeaders[6]).html(alternativeValues[3]);
        $(trackerHeaders[7]).html(alternativeValues[4]);

        var expenses = $("#expenseType").children();
        $(expenses[1]).html(alternativeValues[0]);
        $(expenses[2]).html(alternativeValues[1]);
        $(expenses[4]).html(alternativeValues[2]);
        $(expenses[5]).html(alternativeValues[3]);
        $(expenses[6]).html(alternativeValues[4]);

    }
}

function burgerMenuBehavior() {
    // change burger appearance when menu open
    var menu = $('.navbar-container');
    var burger = $('.burger-container');
    var header = $('header');
    var modal = $('.modal');
    var body = $('body');

    burger.click(function () {
        burger.toggleClass('burger-open');
        // show menu and modal
        menu.toggleClass('nav-open');
        modal.toggleClass('show-modal');
        body.toggleClass('prevent-scroll');
    });

    // always close menu after a click
    $('body').click(function(ev) {

        if (menu.hasClass('nav-open') &&
            !document.querySelector('header').contains(ev.target)) {
            menu.toggleClass('nav-open');
            burger.toggleClass('burger-open');
            modal.toggleClass('show-modal');
            body.toggleClass('prevent-scroll');
        }

    });
}

function linkTwoTableColWidths(table1, table2) {

    // set both tables to the same width
    table2.style.width = getComputedStyle(table1).width;
    table2.style.margin = getComputedStyle(table1).margin;
    table2.style.padding = getComputedStyle(table1).padding;

    console.log(table2.style.width);

    // get first row of cols for both table
    var t1cols = table1.querySelector('tr').querySelectorAll('td, th');
    var table2cols = table2.querySelector('tr').querySelectorAll('td, th');

    // copy sizes from one array of cols to the other
    t1cols.forEach(function (col, index, array) {
        var styles = getComputedStyle(col);
        table2cols[index].style.width = parseInt(styles.width) + parseInt(styles.paddingLeft) +
            parseInt(styles.paddingRight) - 2 + 'px';
        console.log(table2cols[index].style.width);
    });

    // enlarge comment box
    enlargeCommentBox();
}

function enlargeCommentBox () {
    var table1 = document.querySelectorAll('#logs table')[0];
    var table2 = document.querySelectorAll('#logs table')[1];
    var t1FirstRow = table1.querySelector('tr').querySelectorAll('td, th');
    var t2FirstRow = table2.querySelector('tr').querySelectorAll('td, th');
    var lastComment1 = t1FirstRow[t1FirstRow.length - 1];
    var lastComment2 = t2FirstRow[t2FirstRow.length - 1];
    var secondTableWrap = document.querySelector('.second-table');

    for (var elem of [table1, table2, lastComment1]) {
        elem.style.width = parseInt(getComputedStyle(elem).width) + 170 + 'px';
    }

    // make sure both table's width stay in sync
    secondTableWrap.style.maxWidth = table1.style.width;
    lastComment2.style.width = lastComment1.style.width;

    // add padding to comments to ensure visibility
    table2.querySelectorAll('td:last-child').forEach(function(elem) {
        elem.style.paddingRight = '15px';
    });

}

$(function(){
    createPersonalTable(personalPlanClasses);
    populatePctgs(1);
    listenIncomeChanges();
    trackerCategories();
    calculatorRawNumListener();
    refreshButtonSetup();
    registerButton();
    setupNavBar(navBarItems);
    loginButton();
    saveSetup();
    reloadPlan();
    sendLog();
    resetAll();
    setAboutWidth();
    setupYourAgeSelection();
    calculateRetirementAdditionalTriggers();
    burgerMenuBehavior();
});

