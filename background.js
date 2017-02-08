var checkedDomain = 'facebook.com';
var siteDomain = 'https://www.facebook.com/';
var timerDelayUnits = 60000;

var decode_entities = (function() {
    // Remove HTML Entities
    var element = document.createElement('div');

    function decode_HTML_entities (str) {

        if(str && typeof str === 'string') {

            // Escape HTML before decoding for HTML Entities
            str = escape(str).replace(/%26/g,'&').replace(/%23/g,'#').replace(/%3B/g,';');

            element.innerHTML = str;
            str = element.innerText;
            element.innerText = '';
        }
        return unescape(str);
    }
    return decode_HTML_entities;
})();

// add listener before check, because while I was debugging the script,
// the alarm usually went off during check() and before the listener was added
// so the check didn't run at all
chrome.alarms.onAlarm.addListener(check);

chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		if (request.action == "restart") {
			start();
		}
	}
);

/*
 *  window.onload function
 */
function start(){
	// read user settings
	Interval = (localStorage['TimerDelay']*1||300000); // 5 mins
	Sound = (localStorage['PlayRingtone']!='false');
	Ringtone = new Audio('notify.mp3');
	if (!localStorage['counter']) localStorage['counter'] = '0';
	
	// read or set 'checkAlarm'
	chrome.alarms.get(
		'checkAlarm',
		function(a){
			if (typeof a=='object') {
				chrome.alarms.create('checkAlarm', {periodInMinutes:Interval/timerDelayUnits});
			} else {
				chrome.alarms.create(
					'checkAlarm',
					{
						when:Date.now()+5000, // delay 5 seconds when starting browser
						periodInMinutes:Interval/timerDelayUnits
					}
				);
			}
		}
	);
}

window.alreadyChecking = false;
/*
 *  check if page is already on active tab
 */
function check(){
	if (!alreadyChecking){
		if (!window.btnClkd){ // button not clicked
			chrome.tabs.getSelected(null,function(tab){
				var g=tab.url.indexOf(checkedDomain);
				if(g==-1||g>12){ //'facebook.com' may be at most at 13th place: [https://www.f] <- 'f' is 13th char
					var now=new Date();
					chrome.browserAction.setTitle({title:'Connecting ('+now.toLocaleTimeString()+')'});
					checkNotifications();
				} else {
					clearButton();
				}
			});
		} else { // button clicked
			window.btnClkd = false;
		}
	}
}

/*
 *  get Facebook page and check/count notifications
 */
function checkNotifications(){
	window.alreadyChecking = true;
	var xhr=new XMLHttpRequest();
	xhr.open('GET','https://m.facebook.com/nearby/search/',true); // …/nearby/search/ is a page with relatively least size on FB
	xhr.onreadystatechange=function(){

		if(xhr.readyState==4){

			if(xhr.responseText.match('notifications_jewel')){
				
				chrome.browserAction.setIcon({path:'images/icon.png'});

				var fReqRX=xhr.responseText.match(/(?: id="requests_jewel".*?<a .*?<span .*?>)(.*?)(?:<\/span><div .*?<span .*? data-sigil="count">)(.*?)(?:<\/span>)/);
					var fReq= +(fReqRX[2]);
				var fMesRX=xhr.responseText.match(/(?: id="messages_jewel".*?<a .*?<span .*?>)(.*?)(?:<\/span><div .*?<span .*? data-sigil="count">)(.*?)(?:<\/span>)/);
					var fMes= +(fMesRX[2]);
				var fNotRX=xhr.responseText.match(/(?: id="notifications_jewel".*?<a .*?<span .*?>)(.*?)(?:<\/span><div .*?<span .*? data-sigil="count">)(.*?)(?:<\/span>)/);
					var fNot= +(fNotRX[2]);
				
				var counter=fReq+fMes+fNot;

				if (counter>0) {
					var badgeTitle='Online ('+(new Date()).toLocaleTimeString()+')';
						if (fReq>0) badgeTitle+='\n – '+decode_entities(fReq+' '+fReqRX[1]);
						if (fMes>0) badgeTitle+='\n – '+decode_entities(fMes+' '+fMesRX[1]);
						if (fNot>0) badgeTitle+='\n – '+decode_entities(fNot+' '+fNotRX[1]);
					chrome.browserAction.setTitle({title:badgeTitle});
					chrome.browserAction.setBadgeText({text:''+counter});
					chrome.browserAction.setBadgeBackgroundColor({color:[208,0,24,255]}); // GMail red // it was green rgb(0,204,51) before
					if (Sound && (counter>(+localStorage['counter']))) {
						Ringtone.play();
					}
					localStorage['counter'] = counter;
				} else {
					clearButton();
				}
			} else {
				chrome.browserAction.setIcon({path:'images/icon-offline.png'});
				chrome.browserAction.setTitle({title:'Disconnected ('+(new Date()).toLocaleTimeString()+')'});
				chrome.browserAction.setBadgeBackgroundColor({color:[155,155,155,255]}); //grey
				chrome.browserAction.setBadgeText({text:'?'});
				return;
			}
			window.alreadyChecking = false;
		} else return;
	}
	xhr.send(null);
}

/*
 *  restore blank button badge and counter=0
 */
function clearButton() {
	chrome.browserAction.setBadgeText({text:''});
	chrome.browserAction.setTitle({title:'Last check ('+(new Date()).toLocaleTimeString()+')'});
	localStorage['counter'] = 0;
}

/*
 *  button onClick event
 */
window.btnClkd = false;
chrome.browserAction.onClicked.addListener(function(tab){
	window.btnClkd = true;
	chrome.windows.getAll({populate:true},function(windows){
		for(var i=0;i<windows.length;i++){
			var tabs=windows[i].tabs;
			for(var j=0;j<tabs.length;j++){
				var g=tabs[j].url.indexOf(checkedDomain);
				if(g>-1&&g<13){
					chrome.tabs.update(tabs[j].id,{selected:true});
					return;
				}
			}
		}
		chrome.tabs.getSelected(null,function(tab){
			if(tab.url=='chrome://newtab/'){
				chrome.tabs.update(tab.id,{url:siteDomain});
			}
			else {
				chrome.tabs.create({url:siteDomain,selected:true});
			}
		});
	});
	clearButton();
});

window.onload=start;