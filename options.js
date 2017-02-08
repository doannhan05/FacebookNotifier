var timerDelayUnits = 60000; // milliseconds in a minute

function read(el) {
    var sett = localStorage[el.name];
    if (sett) {
        sett = ( sett == 'true' ? true : (sett == 'false' ? false : sett) );

        if (el.type == 'checkbox') {
            el.checked = sett;
        }
        else if (el.type == 'text') {
            if (el.name == 'TimerDelay') sett /= timerDelayUnits;
            el.value = sett;
        }
    }
}

function save() {
    if (this.type == 'checkbox') {
        localStorage[this.name] = this.checked ? true : false;
    } else if (this.type == 'text') {
        if (this.name == 'TimerDelay') {
            localStorage[this.name] = this.value.replace(/,/, '.').replace(/[^\.\d]/g, '').replace(/(\d+(?:\.(?:\d+)?)?).*/, '$1') * timerDelayUnits;
        } else {
            localStorage[this.name] = this.value;
        }
    }
    
    // restart background process
    chrome.runtime.sendMessage({action: "restart"}, function(response) {});
}

function options() {
    var a = document.getElementsByTagName('input');
    for (var i = 0; i < a.length; i++) {
        a[i].addEventListener((a[i].type == 'checkbox' ? 'click' : 'input'), save, false);
        read(a[i]);
    }
}

window.onload = options;