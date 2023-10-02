(function () {
  var el = function (id) {
    return document.getElementById(id);
  };
  var IDs = {};

  var QUESTIONS = [
    "Team members admit their mistakes.",
    "Team members are passionate and unguarded in their discussion of issues.",
    "Team members are quick to point out the contributions and achievements of others.",
    "Team meetings are interesting and compelling (not boring).	",
    "During team meetings, the most important - and difficult - issues are discussed.",
    "Team members acknowledge their weaknesses to one another.",
    "Team members voice their opinions, even at the risk of causing disagreement.",
    "Team members point out one another's unproductive behaviours.",
    "The team has a reputation for high performance.",
    "Team members ask for help without hesitation.",
    "Team members leave meetings confident that everyone is committed to the decisions that were agreed upon.",
    "During discussions, team members challenge one another about how they arrived at their conclusions and opinions.",
    "Team members ask one another for input regarding their areas of responsibility.",
    "When the team fails to achieve collective goals, each member takes personal responsibility to improve the team's performance.",
    "Team members willingly make sacrifices in their areas for the good of the team.",
    "Team members are quick to confront peers about problems in their respective areas of responsibility.",
    "Team members acknowledge and tap into one another's skills and expertise.",
    "Team members solicit one another's opinions during meetings.",
    "Team members end discussions with clear and specific resolutions and calls to action.",
    "Team members questions one another about their current approaches and methods.",
    "The team ensures that poor performers feel pressure and the expectation to improve.",
    "Team members willingly apologise to each other.",
    "Team members communicate unpopular opinions to the group.",
    "The team is clear about it's direction and priorities.",
    "Team members are slow to seek credit for their own contributions.",
    "All members of the team are held to the same high standards.",
    "When conflict occurs, the team confronts and deals with the issue before moving on to another subject.",
    "The team is aligned around common objectives.",
    "The team consistently achieves it's objectives.",
    "The team is decisive, even when perfect information is not available.",
    "Team members value collective success more than individual achievement.",
    "Team members are unguarded and genuine with one another.",
    "Team members can comfortably discuss their personal lives with one another.",
    "The team sticks to decisions.",
    "Team members consistently follow through on promises and commitments.",
    "Team members offer unprovoked, constructive feedback to one another.",
    "Team members place little importance on titles and status. (A high score on this statement indicates that titles and status are NOT important to team members).	",
    "Team members support group decisions, even if they initially disagreed.",
  ];

  var answers = [];

  var cacheIDs = function () {
    IDs.container = el("five-dysfunctions");
    IDs.questionBlock = el("five-dysfunctions--question-block");
    IDs.count = el("five-dysfunctions--count");
    IDs.question = el("five-dysfunctions--question");
    IDs.answer1 = el("five-dysfunctions--answer1");
    IDs.answer2 = el("five-dysfunctions--answer2");
    IDs.answer3 = el("five-dysfunctions--answer3");
    IDs.answer4 = el("five-dysfunctions--answer4");
    IDs.answer5 = el("five-dysfunctions--answer5");
    IDs.resultsBlock = el("five-dysfunctions--results-block");
    IDs.result1 = el("five-dysfunctions--results__trust");
    IDs.result2 = el("five-dysfunctions--results__conflict");
    IDs.result3 = el("five-dysfunctions--results__commitment");
    IDs.result4 = el("five-dysfunctions--results__accountability");
    IDs.result5 = el("five-dysfunctions--results__results");
  };

  var setEventListeners = function () {
    IDs.answer1.addEventListener("click", onClick(1));
    IDs.answer2.addEventListener("click", onClick(2));
    IDs.answer3.addEventListener("click", onClick(3));
    IDs.answer4.addEventListener("click", onClick(4));
    IDs.answer5.addEventListener("click", onClick(5));
  };

  var isDone = function () {
    return answers.length >= 38;
  };

  var sumAverage = function () {
    var indexes = Array.from(arguments);
    var scores = indexes.map(function (idx1) {
      return answers[idx1 - 1];
    });
    var total = scores.reduce(function (a, b) {
      return a + b;
    }, 0);
    return round2(total / scores.length);
  };

  var calculateResults = function () {
    return {
      trust: sumAverage(1, 6, 10, 13, 17, 22, 32, 33),
      conflict: sumAverage(2, 4, 5, 7, 12, 18, 23, 27),
      commitment: sumAverage(11, 19, 24, 28, 30, 34, 38),
      accountability: sumAverage(8, 16, 20, 21, 26, 35, 36),
      results: sumAverage(3, 9, 14, 15, 25, 29, 31, 37),
    };
  };

  var round2 = function (n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  };

  var renderResults = function () {
    IDs.questionBlock.style.display = "none";

    var results = calculateResults();
    IDs.result1.textContent = results.trust;
    IDs.result2.textContent = results.conflict;
    IDs.result3.textContent = results.commitment;
    IDs.result4.textContent = results.accountability;
    IDs.result5.textContent = results.results;

    IDs.resultsBlock.style.display = "block";
  };

  var nextQuestion = function () {
    var questionIndex = answers.length;
    IDs.count.textContent = questionIndex + 1;
    IDs.question.textContent = QUESTIONS[questionIndex];
  };

  var onClick = function (score) {
    return function () {
      answers.push(score);
      if (isDone()) {
        renderResults();
      } else {
        nextQuestion();
      }
    };
  };

  // Start app
  addEventListener("DOMContentLoaded", function () {
    cacheIDs();
    setEventListeners();

    nextQuestion();
    IDs.container.style.display = "block";
  });
})();
