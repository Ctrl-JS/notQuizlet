const params = new URLSearchParams(window.location.search);
let result = {"cards": [], "version": 1};
let splitter = ", ";
let divider = "\n";
if (params.get('s') === 'q' || params.get('qUrl')) {
  document.getElementById('iframeArea').classList.add('expanded');
  document.getElementById('iframe').src = params.get('qUrl') || "https://quizlet.com/search";
  divider = "\n\n\n\n";
  splitter = "\n";
} else {
  document.getElementById('iframeArea').remove();
}
function toggleExp(node, force) {
  node.classList.toggle('expanded', force);
}
document.querySelectorAll('#nameInput, #termLInput, #defLInput, #textArea')
  .forEach((node) => {
    node.addEventListener('change', () => {
      preview();
    });
  });
function preview(text=document.getElementById('textArea').value){
  toggleExp(document.getElementById('previewArea'), true);
  result.cards = [];
  const container = document.getElementById('previewHolder');
  divider = document.querySelector('input[name="dividerOption"]:checked').value;
  splitter = document.querySelector('input[name="splitterOption"]:checked').value;
  text.split(divider).forEach(line => {
    let card = {}
    card.term = line.split(splitter)[0];
    card.def =  line.split(splitter)[1] || "";
    result.cards.push(card);
  })
  result.date = getDate();
  result.name = document.getElementById('nameInput').value;
  result.termL = document.getElementById('termLInput').value;
  result.defL = document.getElementById('defLInput').value;
  container.innerHTML = result.name+" ("+result.cards.length+" kaarten)    "+result.termL+": "+result.defL+"    @"+result.date+"    .quiz-versie: "+result.version+"\n\n";
  result.cards.forEach(card => {
    container.innerHTML += card.term + ": " + card.def + "\n";
  });
}
function getDate() {
  const date = new Date();
  return date.toLocaleDateString("nl-BE");
}
function saveFile(data=result) {
  if (result.cards.length > 3 && result.name && result.termL && result.defL) {
    const blob = new Blob([JSON.stringify(data, null, 0)], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = data.name + '.quiz';
    link.click();
  } else {
    alert("Voer eerst alle nodige gegevens in: titel, taal en minstens 4 kaarten.");
  }
}
