let quiz = {"date": undefined, "tags": undefined};
const popup = document.createElement('div');
popup.className = 'filter';
popup.addEventListener('click', hidePopUp);
let page = 'home';
let editing = false;
let animationsOn = ((localStorage.getItem('animationsOn') || "true") === "true");
document.getElementById('animateSwitch').checked = animationsOn;
let quiz_mode = JSON.parse(localStorage.getItem('quiz-mode')) || {
  "repeat": 1, //1-10x
  "random": false, //true/false
  "direction": 1, //0: <-, 1: ->, 2: <->
  "repeatMistake": "streak", //1, net, streak
  "streakCount": 3,
  "mistakePosition": "shift",//direct, shift, end
  "hints": false,
  "qTypes": [true, false, true], //write/choose/card
  "nextTypePosition": "shift", //direct, shift, end
  "writeOver": true,
  "starOnly": false,
  "allAns": true,
  "ignoreCase": true,
  "ignoreParenthesis": false
};
let todo = [];
let unsaved = false;
const card_mode = {repeat:1,qTypes:[false,false,true],starOnly:false};
const write_mode = {repeat:1,repeatMistake:"net",mistakePosition:"end",hints:false,qTypes:[true,false,false],writeOver:true,starOnly:false};
const study_mode = {repeat:1,repeatMistake:"net",mistakePosition:"shift",hints:false,qTypes:[true,true,false],nextTypePosition:"shift",writeOver:true,starOnly:false};

function fileHandler(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    JSONHandler(JSON.parse(e.target.result.toString()));
  }
  reader.readAsText(file);
}
function JSONHandler(json) {
  quiz = json;
  document.getElementById('fastModesTitle').style.display = "block";
  document.getElementById('fastModes').style.display = "flex";
  document.getElementById('cardHolderTitle').style.display = 'block';
  document.getElementById('cardHolder').innerHTML = '';
  document.getElementById('tagHolder').innerHTML = '';
  document.getElementById('nameHolder').innerHTML = quiz.name;
  [quiz.date || "?", quiz.termL || "?", quiz.defL || "?", quiz.cards.length + " kaarten"].concat(quiz.tags || [])
    .forEach(tag => {
      document.getElementById('tagHolder')
        .innerHTML += "<span class='tag'>" + tag + "</span>";
    })
  document.getElementById('tagHolder')
    .innerHTML += "<button class='addTagBtn' onclick='addTag()'>+</button>";
  quiz.cards.forEach((card, i) => {
    document.getElementById('cardHolder')
      .innerHTML += smokeyCard(card.term, card.def, i);
  });
  const addBtn = document.createElement('button');
  addBtn.id = 'addCardBtn';
  addBtn.innerHTML = '<div class="add"></div>';
  addBtn.addEventListener('click', () => {
    addCard();
  })
  addBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      addCard();
    }
  })
  document.getElementById('cardHolder').appendChild(addBtn);
  document.getElementById('editButton').style.display = 'flex';
}

//launch from file
if ('launchQueue' in window && 'files' in LaunchParams.prototype) {
  launchQueue.setConsumer((launchParams) => {
    if (!launchParams.files.length) {
      //pass
    } else {
      launchParams.files[0].getFile().then((result) => {fileHandler(result)});
    }
  })
}

document.getElementById("upload-btn").addEventListener("change", (event) => {
  fileHandler(event.target.files[0])
});

document.body.addEventListener('dragover', (e) => {e.preventDefault();});
document.body.addEventListener('drop', (e) => {
  e.preventDefault();
  console.log(e.dataTransfer.types[0]);
  fileHandler(e.dataTransfer.files[0]);
})

document.body.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    if (quiz.cards) {
      saveFile();
    }
  }
})

document.getElementById("settingsButton")
  .addEventListener("click", (event) => {
    event.target.blur();
    show('settings');
  })

document.getElementById("animateSwitch")
  .addEventListener("change", (event) => {
    animationsOn = event.target.checked;
    localStorage.setItem('animationsOn', animationsOn);
  });

function newQuiz() {
  if (editing) {toggleEdit();}
  JSONHandler({
    name: "Nieuwe set",
    date: getDate(),
    termL: prompt("Taal termen:"),
    defL: prompt("Taal definities:"),
    cards: [{term:"",def:""},{term:"",def:""},{term:"",def:""},{term:"",def:""}]
  });
  toggleEdit();
}

function saveFile(data=quiz) {
  unsaved = false;
  const blob = new Blob([JSON.stringify(data, null, 0)], {type: 'application/json'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = data.name + '.quiz';
  link.click();

}

function addTag() {
  const tag = document.createElement('div');
  tag.className = 'tag';
  tag.innerHTML = prompt('Nieuwe tag:');
  if (quiz.tags) {
    quiz.tags.push(tag.innerHTML);
  } else {
    quiz.tags = [tag.innerHTML];
  }
  document.getElementById('tagHolder')
    .insertBefore(tag, document.querySelector('.addTagBtn'));
  changes();
}

function getDate() {
  const date = new Date();
  return date.toLocaleDateString("nl-BE");
}

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function highlight(correct=true) {
  document.querySelector('html').classList.add(correct ? "highlight" : "highlight-red");
  setTimeout(() => {
    document.querySelector('html').classList.remove(correct ? "highlight" : "highlight-red");
  }, 1000)
}

function addMistake(todoTask) {
  todoTask[2] = (quiz_mode.repeatMistake === "streak" ? quiz_mode.streakCount-1 : todoTask[2]+1);
  return todoTask;
}

function subtractMistake(todoTask) {
  todoTask[2]--;
  return todoTask;
}

function transformType(todoTask, decrease) {
  todoTask[3] -= decrease;
  return todoTask;
}

function toPosition(todoTask, mode) {
  if (mode === 'direct') {
    todo.splice(1, 0, todoTask);
  } else if (mode === 'shift') {
    if (todo.length < 11) {
      todo.splice(-1, 0, todoTask);
    } else {
      todo.splice(getRandom(5, 10), 0, todoTask);
    }
  } else if (mode === 'end') {
    todo.push(todoTask);
  }
}

function modePrompt(save=true) {
  let prefs = settingRow('Willekeurig', 'Vraag termen in willekeurige volgorde.', 'switch', quiz_mode.random)
    +settingRow('Enkel met ster', 'Enkel termen met ster leren', 'switch', quiz_mode.starOnly)
    +settingRow('Richting', 'Antwoorden met:', ['Term', 'Definitie', 'Beide'], quiz_mode.direction, [0, 1, 2])
    +settingRow('Kaarten', 'Ondervraag aan de hand van kaarten.', 'switch', quiz_mode.qTypes[2])
    +settingRow('Meerkeuze', 'Ondervraag meerkeuzevragen.', 'switch', quiz_mode.qTypes[1])
    +settingRow('Schrijven', 'Ondervraag door het antwoord te schrijven.', 'switch', quiz_mode.qTypes[0])
    +settingRow('Vraagtype-opvolging', 'Bepaal wanneer dezelfde term op een andere manier (kaart, meerkeuze, schrijven) wordt gevraagd: meteen, na enkele vragen of op het einde.', ['Meteen', 'Tussendoor', 'Einde'], quiz_mode.nextTypePosition, ["direct", "shift", "end"])
    +settingRow('1 antwoord geven', 'Accepteer 1 (of meer) antwoordmogelijkheden als juist. Antwoorden worden gescheiden door een komma en een spatie (", ") of een schuine streep ("/").', "switch", !quiz_mode.allAns)
    +settingRow('Hoofdletters negeren', 'Negeer het gebruik van hoofdletters en kleine letters in antwoorden', 'switch', quiz_mode.ignoreCase)
    +settingRow('Haakjes negeren', 'Negeer tekst tussen haakjes bij de correctie van antwoorden', 'switch', quiz_mode.ignoreParenthesis)
    +settingRow('Fouten', 'Herhaal foute antwoorden meteen, na enkele vragen of op het einde.', ['Meteen', 'Tussendoor', 'Einde'], quiz_mode.mistakePosition,["direct", "shift", "end"])
    +settingRow('Correcte antwoorden herhalen', 'Bepaal hoe vaak een correct antwoord moet gegeven worden nadat een vraag fout is beantwoord: 1 maal, 1 maal vaker dan er foute antwoorden zijn gegeven of een reeks van juiste antwoorden op een rij.', ['1x', 'Netto', 'Reeks'], quiz_mode.repeatMistake, ['1', 'net', 'streak'])
    +settingRow('Reekslengte', 'Stel in hoe vaak op een rij een juist antwoord gegeven moet worden. Enkel van toepassing indien "Correcte antwoorden herhalen" op "reeks" staat.', 'number', quiz_mode.streakCount)
    +settingRow('Verbeteren', 'Verbeter foute antwoorden door het juiste over te schrijven. Onthul het juiste antwoord bij meerkeuzevragen.', 'switch', quiz_mode.writeOver)
    +settingRow('Hints', 'Krijg hints bij schrijfvragen.', 'switch', quiz_mode.hints)
    +settingRow('Herhalen', 'Herhaal de volledige leermodus een aantal keer zonder deze te moeten herstarten.', 'number', quiz_mode.repeat);
  popup.innerHTML = "<div class='popup'><div style='display: flex;flex-direction: column'>" + prefs + "</div><div class='settingRow' style='justify-content: flex-end'><button class='default-button second-button' onclick='hidePopUp()'>Annuleren</button>"+(save?"<button class='default-button second-button' onclick='submitMode(false)'>Opslaan</button>":"")+"<button class='default-button' onclick='submitMode()'>Leren</button></div></div>";
  document.body.appendChild(popup);
}

function settingRow(title, text, type, current, values=[]) {
  const sTitle = title.replaceAll(" ", "-");
  let input;
  if (type === 'switch') {
    input = '<label class="switch">\n' +
      '<input type="checkbox" id="'+sTitle+'Switch" '+ (current ? 'checked' : '') +'>\n' +
      '<span class="switch-slider"></span>\n' +
      '</label>\n';
  } else if (type === 'number') {
    input = '<input id="'+ sTitle +'Input" type="number" autocomplete="off" value="'+ current +'" min="1" max="10" placeholder="1-10"/>';
  } else if (type.constructor === Array) {
    input = '<div class="multistateSwitch">';
    type.forEach((option, index) => {
      input += '<input id="'+ sTitle + option +'Option" type="radio" name="'+ sTitle +'Option" value="'+ values[index] +'" '+ (values[index]===current ? 'checked' : '') +'>\n' +
        '<label for="'+ sTitle + option +'Option" onclick="">'+ option +'</label>\n';
    });
    input += '</div>';
  }
  return '<div class="settingRow">\n' +
    '<div class="column">\n' +
    '<h3 class="settingText">'+title+'</h3>\n' +
    '<p class="settingText">'+text+'</p>\n' +
    '</div>\n' + input +
    '</div>'
}

function submitMode(start=true) {
  quiz_mode.random = document.getElementById('WillekeurigSwitch').checked;
  quiz_mode.starOnly = document.getElementById('Enkel-met-sterSwitch').checked;
  quiz_mode.direction = Number(document.querySelector('input[name="RichtingOption"]:checked').value);
  quiz_mode.qTypes[0] = document.getElementById('SchrijvenSwitch').checked;
  quiz_mode.qTypes[1] = document.getElementById('MeerkeuzeSwitch').checked;
  quiz_mode.qTypes[2] = document.getElementById('KaartenSwitch').checked;
  quiz_mode.mistakePosition = document.querySelector('input[name="FoutenOption"]:checked').value;
  quiz_mode.nextTypePosition = document.querySelector('input[name="Vraagtype-opvolgingOption"]:checked').value;
  quiz_mode.repeatMistake = document.querySelector('input[name="Correcte-antwoorden-herhalenOption"]:checked').value;
  quiz_mode.streakCount = document.getElementById('ReekslengteInput').value;
  quiz_mode.writeOver = document.getElementById('VerbeterenSwitch').checked;
  quiz_mode.hints = document.getElementById('HintsSwitch').checked;
  quiz_mode.repeat = Number(document.getElementById('HerhalenInput').value);
  quiz_mode.allAns = !document.getElementById('1-antwoord-gevenSwitch').checked;
  quiz_mode.ignoreCase = document.getElementById('Hoofdletters-negerenSwitch').checked;
  quiz_mode.ignoreParenthesis = document.getElementById('Haakjes-negerenSwitch').checked;
  popup.innerHTML = '';
  document.body.removeChild(popup);
  if (start) {startQuiz();}
}

function hidePopUp(event) {
  if (event ? event.target === popup : true) {
    popup.innerHTML = '';
    document.body.removeChild(popup);
  }
}

function smokeyCard(term, def, i) {
  return "<div class='card card-body' data-index='"+ i +"'><span data-type='term'>" + term + "</span>" + "<span data-type='def'>" + def + "</span><button class='star-btn"+ (quiz.cards[i].star ? "star-filled" : "") +"' onclick='toggleStar(Number(this.parentElement.dataset.index))' tabindex='-1'></button></div>"
}

function handleKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    check();
  } else if (e.target.className === 'flashcard' && e.key === ' ') {
    e.preventDefault();
    flipCard();
  }
}

function handleNumberKey(e) {
  if (e.code === 'Digit1' || e.code === 'Numpad1') {
    choose(document.getElementById('choose1'));
  } else if (e.code === 'Digit2' ||  e.code === 'Numpad2') {
    choose(document.getElementById('choose2'));
  } else if  (e.code === 'Digit3' || e.code === 'Numpad3') {
    choose(document.getElementById('choose3'));
  } else if  (e.code === 'Digit4' || e.code === 'Numpad4') {
    choose(document.getElementById('choose4'));
  }
}

function hide() {
  document.getElementById('learnerInput')
    .removeEventListener('keyup', handleKey);
  document.querySelector('.flashcard')
    .removeEventListener('keyup', handleKey);
  document.getElementById('chooserContent')
    .removeEventListener('keyup', handleNumberKey);
  document.getElementById(page).style.display = 'none';
  document.getElementById('home').style.display = 'flex';
  page = 'home';
  headerState(true);
}

function show(linkedPage, resuming=false) {
  document.getElementById(page).style.display = 'none';
  document.getElementById(linkedPage).style.display = 'flex';
  page = linkedPage;
  if (linkedPage === 'learner') {
    headerState(false);
    hideBottomPrompt();
    document.getElementById('learnerInput')
      .addEventListener('keyup', handleKey);
    document.querySelector('.flashcard')
      .addEventListener('keyup', handleKey);
    document.querySelector('.flashcard')
      .addEventListener('click', flipCard);
    document.getElementById('chooserContent')
      .addEventListener('keyup', handleNumberKey);
    if (!resuming) {
      document.getElementById('progressBar')
        .max = todo.length * quiz_mode.qTypes.filter(Boolean).length;
      document.getElementById('progressBar')
        .value = 0;
      nextLearnerQuestion();
    }
  } else if (linkedPage === 'settings') {
    headerState(false);
  } else {
    headerState(true);
  }
}

function resume() {hideBottomPrompt(); show('learner', true)}

function switchLearnerContent(id) {
  document.getElementById(id).style.display = 'block';
  document.querySelectorAll('.learnerContent:not(#'+id+')').forEach(elem => {
    elem.style.display = 'none';
  })
}

function headerState(show) {
  document.querySelector('header').style.display = (show ? 'flex':  'none');
  document.getElementById('editButton').style.display = (show && quiz.cards ? 'flex' : 'none');
}

function toggleStar(i) {
  if (quiz.cards[i].star) {
    delete quiz.cards[i].star;
  } else {
    quiz.cards[i].star = true;
  }
  document.querySelector('div[data-index="'+ i +'"]').children[2].classList.toggle('star-filled');
  changes();
}

function toggleEdit() {
  const btn = document.getElementById('editButton');
  btn.children[0].classList.toggle('edit');
  btn.children[0].classList.toggle('save');
  btn.children[1].innerHTML = (editing ? "Bewerken" : "Opslaan");
  document.querySelectorAll('.card-body span, #nameHolder').forEach(elem => {
    elem.toggleAttribute('contenteditable');
    if (editing) {
      if (elem.parentElement.dataset.index) {
        quiz.cards[elem.parentElement.dataset.index][elem.dataset.type] = elem.textContent.trim();
      } else if (elem.id === 'nameHolder') {
        quiz.name = elem.textContent.trim();
      }
      quiz.date = getDate();
      document.getElementsByClassName('tag')[0].innerHTML = quiz.date;
      changes();
    }
  })
  editing = !editing;
}

function addCard() {
  if (!editing) {toggleEdit()}
  const parser = new DOMParser();
  const card = parser.parseFromString(smokeyCard('', '', quiz.cards.push({"term":"","def":""})-1), 'text/html').body.firstChild;
  card.children[0].contentEditable = true;
  card.children[1].contentEditable = true;
  document.getElementById('cardHolder').insertBefore(card, document.getElementById('addCardBtn'));
  card.children[0].focus();
}

function bottomPrompt(text, onclick, button="Ok", cancel="Annuleren") {
  const p = document.getElementById('bottomPrompt');
  p.children[0].innerHTML = text;
  p.children[1].innerHTML = cancel;
  p.children[2].innerHTML = button;
  p.children[2].onclick = onclick;
  p.style.display = 'flex';

}

function hideBottomPrompt() {
  document.getElementById('bottomPrompt').style.display = 'none';
}

function generator() {
  todo = [];
  const firstQType = quiz_mode.qTypes.findLastIndex((e) => e);
  const directionFactor = (quiz_mode.direction === 2 ? 1 : 0);
  for (let d = 0; d <= directionFactor; d++) {
    for (let r = 0; r < quiz_mode.repeat; r++) {
      let iList = [...Array(quiz.cards.length).keys()];
      if (quiz_mode.starOnly) {
        iList = iList.filter(elem => quiz.cards[elem].star)
      }
      for (let i = 0; iList.length > 0; i++) {
        const newTodo = [
          iList.splice((quiz_mode.random ? getRandom(0, iList.length) : 0), 1)[0],
          (quiz_mode.direction < 2 ? quiz_mode.direction : d),
          0,
          firstQType
        ]; //[index, direction, timesWrong, mode(write/choose/card)]
        todo.push(newTodo);
      }
    }
  }
} //generate todolist

function startQuiz(mode=quiz_mode) {
  quiz_mode = {...quiz_mode, ...mode};
  if (editing) {toggleEdit();}
  if (modeReliabilityChecker()) {
    generator();
    show("learner");
  }
} //set mode, open page

function nextLearnerQuestion() {
  if (todo.length > 0) {
    const d = (todo[0][1] === 0);
    const q = quiz.cards[todo[0][0]][d ? 'def' : 'term'];
    if (todo[0][3] === 0) { //write
      document.getElementById('learnerInput').value = '';
      document.getElementById('learnerQuestion').innerHTML = q;
      if (quiz_mode.hints) {
        document.getElementById('learnerHint').innerHTML =
          quiz.cards[todo[0][0]].hint || 'Antwoord';
      } else {
        document.getElementById('learnerHint').innerHTML = 'Antwoord';
      }
      switchLearnerContent('learnerContent');
      document.getElementById('learnerInput').focus();
    } else if (todo[0][3] === 1) { //choose
      document.getElementById('chooserQuestion').innerHTML = q;
      const btns = document.querySelectorAll('#choose1, #choose2, #choose3, #choose4');
      const i = getRandom(0, 4);
      let falseIndices = [...Array(quiz.cards.length).keys()];
      falseIndices.splice(falseIndices.indexOf(todo[0][0]), 1); //[0...N]\tdo[0][0]
      btns.forEach((btn, index) => {
        if (index === i) {
          btn.children[1].innerHTML = quiz.cards[todo[0][0]][d ? 'term' : 'def'];
          btn.dataset.correct = "true";
        } else {
          const fi = getRandom(0, falseIndices.length);
          btn.children[1].innerHTML = quiz.cards[falseIndices[fi]][d ? 'term' : 'def'];
          falseIndices.splice(fi, 1);
          btn.dataset.correct = "false";
        }
      })
      switchLearnerContent('chooserContent');
      document.getElementById('chooserContent').focus();
    } else if (todo[0][3] === 3) { //writeOver
      document.getElementById('learnerInput').value = '';
      document.getElementById('learnerQuestion').innerHTML = quiz.cards[todo[0][0]][d ? "def" : "term"] + ":\n" + quiz.cards[todo[0][0]][d ? "term" : "def"];
      document.getElementById('learnerHint').innerHTML = 'Schrijf het juiste antwoord over';
      switchLearnerContent('learnerContent');
      document.getElementById('learnerInput').focus();
    } else { //card
      const card = document.querySelector('.flashcard');
      card.innerHTML = q;
      switchLearnerContent('flashcardContent');
      card.focus();
    }
  } else {
    hide();
    alert("Proficiat!");
  }
}

function check() { //check answer
  const progressBar = document.getElementById('progressBar');
  if (todo[0][3] === 0) { //write
    let answer = (todo[0][1] === 0 ? quiz.cards[todo[0][0]].term : quiz.cards[todo[0][0]].def).replaceAll('\n', ' ');
    let given = document.getElementById("learnerInput").value;
    if (quiz_mode.ignoreCase) {
      answer = answer.toLowerCase();
      given = given.toLowerCase();
    }
    if (quiz_mode.ignoreParenthesis) {
      answer = answer.replace(/\(.*?\)/g, '');
      given = given.replace(/\(.*?\)/g, '');
    }
    answer = answer.trim().replace('  ', ' ');
    given = given.trim().replace('  ', ' ');
    if (!quiz_mode.allAns) {answer = answer.split(/[/, ]+/)}
    if (quiz_mode.allAns ? (given === answer) : (given.split(/[/, ]+/).every(s => answer.includes(s) || s === ''))) {
      if (todo[0][2] > 0 && (quiz_mode.repeatMistake === "net" || quiz_mode.repeatMistake === "streak")) {
        if (quiz_mode.mistakePosition === "direct") {
          todo[0] = subtractMistake(todo[0]);
        } else if (quiz_mode.mistakePosition === "shift") {
          if (todo.length < 11) {
            todo.splice(-1, 0, subtractMistake(todo.shift()));
          } else {
            const randIndex = getRandom(5, 10);
            todo.splice(randIndex, 0, subtractMistake(todo[0]));
            todo.shift();
          }
        }
        if (quiz_mode.mistakePosition === "end") {
          todo.push(subtractMistake(todo.shift()));
        }
        progressBar.max++;
      } else {
        todo.shift();
      }
      if (animationsOn) {
        highlight();
      }
      progressBar.value++;
    } else {
      if (quiz_mode.writeOver) {
        todo.splice(1, 0, transformType(todo[0].slice(), -3));
      }
      if (quiz_mode.repeatMistake === "1" || quiz_mode.repeatMistake === "net" || quiz_mode.repeatMistake === "streak") {
        if (quiz_mode.mistakePosition === "direct") {
          todo[0] = addMistake(todo[0]);
          if (quiz_mode.writeOver) {
            todo.splice(1, 0, todo.shift())
          }
        } else if (quiz_mode.mistakePosition === "shift") {
          if (todo.length < 11) {
            todo.splice(-1, 0, addMistake(todo.shift()));
          } else {
            const randIndex = getRandom(5, 10);
            todo.splice(randIndex, 0, addMistake(todo[0]));
            todo.shift();
          }
        }
        if (quiz_mode.mistakePosition === "end") {
          todo.push(addMistake(todo.shift()));
        }
      }
      if (animationsOn) {
        highlight(false);
      }
    }
  } else if (todo[0][3] === 1) { //choose
    alert('!check on choose');
  } else if (todo[0][3] === 3) { //writeOver
    if (document.getElementById('learnerInput').value === (todo[0][1] === 0 ? quiz.cards[todo[0][0]].term : quiz.cards[todo[0][0]].def).replaceAll('\n', ' ')) {
      todo.shift();
      nextLearnerQuestion();
    }
  } else { //card
    if (animationsOn) {highlight()}
    progressBar.value++;
    if (quiz_mode.qTypes[1]) { //add choose question
      toPosition(transformType(todo[0], 1), quiz_mode.nextTypePosition);
    } else if (quiz_mode.qTypes[0]) { //add write question
      toPosition(transformType(todo[0], 2), quiz_mode.nextTypePosition);
    }
    todo.shift();
  }
  nextLearnerQuestion();
}

function flipCard() {
  const card = document.querySelector('.flashcard');
  card.style.transform = (animationsOn ? "rotateX(90deg)" : "none");
  setTimeout(() => {
    card.innerHTML = quiz.cards[todo[0][0]][card.innerHTML === quiz.cards[todo[0][0]].term ? "def" : "term"];
    card.style.transform = (animationsOn ? "rotateX(0deg)": "none");
  }, 300)
  card.focus();
}

function choose(node) {
  const progressBar = document.getElementById('progressBar');
  if (node.dataset.correct === "true") { //correct
    if (quiz_mode.qTypes[0]) {
      toPosition(transformType(todo[0], 1), quiz_mode.nextTypePosition);
    }
    progressBar.value++;
    if (animationsOn) {highlight()}
    todo.shift();
    nextLearnerQuestion();
  } else { //wrong
    toPosition(addMistake(todo[0]), quiz_mode.mistakePosition);
    if (animationsOn) {highlight(false)}
    todo.shift();
    if (quiz_mode.writeOver) {
      const cLst = document.querySelector('.chooser-button-card[data-correct="true"]').classList;
      cLst.add('green');
      sleep(2000).then(() => {
        cLst.remove('green');
        nextLearnerQuestion();
      });
    } else {
      nextLearnerQuestion();
    }
  }
}

function modeReliabilityChecker() {
  if (quiz.cards) {
    if ((quiz_mode.starOnly ? quiz.cards.filter((elem) => elem.star) : quiz.cards).length >= 4) {
      if (0 < quiz_mode.repeat && quiz_mode.repeat <= 10) {
        if (quiz_mode.repeatMistake === "streak" || quiz_mode.repeatMistake === "net" || quiz_mode.repeatMistake === "1") {
          if (quiz_mode.qTypes.filter(Boolean).length > 0) {
            return true;
          } else {
            alert('Geen vraagtype gekozen');
          }
        } else {
          alert('Ongeldige modus');
        }
      } else {
        alert('Ongeldige waarde voor herhalen')
      }
    } else {
      alert('Te weinig kaarten in set')
    }
  } else {
    alert("Geen kaarten ingeladen");
  }
  return false;
}

function changes() {
  if (!unsaved) {
    unsaved = true;
    window.addEventListener('beforeunload', (e) => {
      if (unsaved) {
        e.preventDefault();
        bottomPrompt('Niet gedownloade wijzigingen in .quiz-bestand. Wijzigingen downloaden naar lokaal bestand?', saveFile(quiz), "Downloaden")
      }
    })
  }
}
