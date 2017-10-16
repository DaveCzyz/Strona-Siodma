function initMap() {
    var map = new google.maps.Map(document.getElementById('map'), {
        mapTypeControl: false,
        gestureHandling: 'greedy',
        center: {lat: 50.057704, lng: 19.941693},
        zoom: 13
    });

    try{
        new AutocompleteDirectionsHandler(map);
    }catch(error){
        location.reload();
    } 
}

function AutocompleteDirectionsHandler(map) {
    this.map = map;
    this.originPlaceId = null;
    this.destinationPlaceId = null;
    this.avoidTolls = true;
    var originInput = document.getElementById('origin-input');
    var destinationInput = document.getElementById('destination-input');
    var waypointInput = document.getElementById('waypoint-input');
    var modeSelector = document.getElementById('mode-selector');
    var trafficBtn = document.getElementById('traffic');
    this.directionsService = new google.maps.DirectionsService;
    this.trafficLayer = new google.maps.TrafficLayer;
    this.directionsDisplay = new google.maps.DirectionsRenderer({
        draggable: true,
    });
        
    this.directionsDisplay.setMap(map);
        
    var originAutocomplete = new google.maps.places.Autocomplete(
        originInput, {placeIdOnly: true});
    var waypointAutocomplete = new google.maps.places.Autocomplete(
        waypointInput, {placeIdOnly: true});   
    var destinationAutocomplete = new google.maps.places.Autocomplete(
        destinationInput, {placeIdOnly: true});
// buttony dla opłat 
    this.setupClickListener('changemode-free', true);
    this.setupClickListener('changemode-paid', false);

    this.setupPlaceChangedListener(originAutocomplete, 'ORIG');
    this.setupPlaceChangedListener(destinationAutocomplete, 'DEST');

    this.waypoint(waypointAutocomplete);

    this.map.controls[google.maps.ControlPosition.LEFT].push(originInput);
    this.map.controls[google.maps.ControlPosition.LEFT].push(waypointInput);
    this.map.controls[google.maps.ControlPosition.LEFT].push(destinationInput);
    this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(modeSelector);
    this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(trafficBtn);
}



// włączanie - wyłączanie opłat:
AutocompleteDirectionsHandler.prototype.setupClickListener = function(id, mode) {
    var radioButton = document.getElementById(id);
    var me = this;
    radioButton.addEventListener('click', function() {
        me.avoidTolls = mode;
        me.route();
    });
};

AutocompleteDirectionsHandler.prototype.setupPlaceChangedListener = function(autocomplete, mode) {
    var me = this;
    autocomplete.bindTo('bounds', this.map);
    autocomplete.addListener('place_changed', function() {
        var place = autocomplete.getPlace();
        if (!place.place_id) {
            window.alert("Please select an option from the dropdown list.");
            return;
          }
        if (mode === 'ORIG') {
            me.originPlaceId = place.place_id;
        } else {
            me.destinationPlaceId = place.place_id;
        }
        me.route();
    });
};

var arr = [];
function clearArr(){
    arr = [];
}

AutocompleteDirectionsHandler.prototype.waypoint = function(autocomplete){
    var me = this;
    autocomplete.addListener('place_changed', function(){
        var place = autocomplete.getPlace();
        me.waypointPlaceId = place.name;
        var obj = {};
        obj.location = place.name;
        arr.push(obj);
        me.waypoints = arr;
        me.route();
        clearArr();
    });
} 

AutocompleteDirectionsHandler.prototype.trafficJam = function(){
    var box = document.getElementById('traffic');
    if(box.checked){
         this.trafficLayer.setMap(this.map)
    } else {
        this.trafficLayer.setMap(null)
    }
}

AutocompleteDirectionsHandler.prototype.route = function() {
    if (!this.originPlaceId || !this.destinationPlaceId) {
        return;
    }
    var me = this;
    this.directionsService.route({
        origin: {'placeId': this.originPlaceId},
        destination: {'placeId': this.destinationPlaceId},
        waypoints : this.waypoints,
        travelMode: 'DRIVING',
        avoidTolls: this.avoidTolls
    }, function(response, status) {
        if (status === 'OK') { 
            me.directionsDisplay.setDirections(response);
          } else {
            window.alert('Directions request failed due to ' + status);
          }
    });
    me.mailTitle(this.originPlaceId, this.destinationPlaceId);
    me.directionsDisplay.addListener('directions_changed', function(){
        computeTotalDistance(me.directionsDisplay.getDirections());
    });
    me.trafficJam();        
};

var mailTitleTxtOrg = document.querySelector('.origin');
var mailTitleTxtDest = document.querySelector('.dest');


AutocompleteDirectionsHandler.prototype.mailTitle = function(origin, destination){
    var me = this;
    var geocoder = new google.maps.Geocoder;
    var infowindow = new google.maps.InfoWindow;
    geocoder.geocode({'placeId': origin}, function(result, status){
        if (status === "OK"){
            mailTitleTxtOrg.innerHTML = result[0].address_components[0].long_name;
        };
    });
    geocoder.geocode({'placeId': destination}, function(result, status){
        if (status === "OK"){
            mailTitleTxtDest.innerHTML = result[0].address_components[0].long_name;
        };
    });       
};

function computeTotalDistance(result) {
    var total = 0;
    var myroute = result.routes[0];
    for (var i = 0; i < myroute.legs.length; i++) {
        total += myroute.legs[i].distance.value;
    }
    total = total / 1000;
    document.getElementById('total').innerHTML = total.toFixed(0);
};


// ZAZNACZ I KOPIUJ TREŚĆ/TYTUŁ MAILA:
var copyAlert = document.querySelector('.copy');
function showAlert(){
    copyAlert.style.opacity = 1;
    setTimeout(function(){
        copyAlert.style.opacity = 0
    }, 1000)
}

function selectElementContents(el) {
    var range;
    if (window.getSelection && document.createRange) {
        range = document.createRange();
        var sel = window.getSelection();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);

        try{
            var successful = document.execCommand('copy');  
            showAlert();
        } catch(error){
            console.log('Oops, unable to cut'); 
        }
    } else if (document.body && document.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(el);
        range.select();

        try{
            var successful = document.execCommand('copy'); 
            showAlert(); 
        } catch(error){
            console.log('Oops, unable to cut'); 
        }
    }
}

var btnC = document.querySelector("#copyTxt").addEventListener('click', copyContent);
var btnT = document.querySelector("#copyTitle").addEventListener('click', copyMailTitle);
var btnH = document.querySelector("#copyHtml").addEventListener('click', copyMailHTML);
function copyContent() {
    var el = document.querySelector("#mail");
    selectElementContents(el);
};
function copyMailTitle(){
    var el = document.querySelector("#mailTitle");
    selectElementContents(el);   
};
function copyMailHTML(){
    var el = document.querySelector("#mailHTML");
    selectElementContents(el);     
}


// POBIERZ DANE Z FORMULARZY / POLCZI I WYGENERUJ OFERTĘ:
var btnTotal = document.querySelector('#generuj').addEventListener('click', function(){
    var data = new Object();

// pobierz kilometry
    var totalKM = document.querySelector('#total').innerHTML;
        data.kilometry = parseFloat(totalKM);
// pobierz stawkę za km
    var stawkaWarpper = document.querySelector('#narzut');
    var stawka = stawkaWarpper.options[stawkaWarpper.selectedIndex].value;
        data.stawkaKM = parseFloat(stawka);
// pobierz rodzaj auta
    var autoWarpper = document.querySelector('#van');
    var auto = autoWarpper.options[autoWarpper.selectedIndex].value;   
        data.autoTyp = auto;
// czas do załadunku
    var loadWarpper = document.querySelector('#loadTo');
    var load = loadWarpper.options[loadWarpper.selectedIndex].value;   
        data.zaladunekZa = load;  
// Transit time
    var ttWarpper = document.querySelector('#TT');
    var tt = ttWarpper.options[ttWarpper.selectedIndex].value;   
        data.transitTime = parseFloat(tt);  
// dodaj prom
    var prom = document.querySelector('input[name="promy"]:checked').value;
        data.promy = parseFloat(prom);
// waluta
    var waluta = document.querySelector('input[name="currency"]:checked').value;
        data.EURGBP = waluta;
    
    if(totalKM == ''){
        alert('Uzupełnij Miasta!');
        return
    };
    return new GenerateOffer(data);
});


function GenerateOffer(arr){
    this.arr = arr;
    km = this.arr.kilometry;
    stawka = this.arr.stawkaKM;
    typ = this.arr.autoTyp;
    timeToLoad = this.arr.zaladunekZa;
    tt = this.arr.transitTime;
    ferry = this.arr.promy;
    currency = this.arr.EURGBP;
    this.summary();
}

GenerateOffer.prototype.costs = function(a, b, c){
    var suma = (a * b) + parseFloat(c);
    var deleteDigit = suma.toFixed(0)
    var costsEuro = roundCost(deleteDigit);

    if(c > 0){
        return costsEuro + ' euro all in'
    } else {
        return costsEuro + ' euro'
    }
}

GenerateOffer.prototype.deliveryTime = function(el4, el5){
    var divide = el4 / el5;
    return Math.round(divide)
}

var euro = [];
var gbp = [];

// POBIERZ AKTUALNY KURS WALUT:

window.onload = function(){
function getPound(){
    var gbpJSON = "https://api.nbp.pl/api/exchangerates/rates/a/gbp/?format=json";
    var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (this.readyState == 4 && this.status == 200){
                var waluta = JSON.parse(this.response);
                gbp.push(waluta.rates[0].mid);
            }
        }
    xhr.open('GET', gbpJSON, true);
    xhr.send();        
}

function getEuro(){
    var euroJSON = 'https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json';
    var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (this.readyState == 4 && this.status == 200){
                var waluta = JSON.parse(this.response);
                euro.push(waluta.rates[0].mid);
                }
            }
        xhr.open('GET', euroJSON, true);
        xhr.send();        
    } 
    getPound();
    getEuro();
}

GenerateOffer.prototype.convertMoney = function(a, b, c){
    var suma = Math.round((a * b) + parseFloat(c));
    var EUR = euro[0];
    var GBP = gbp[0]
    var totalConvert = ((suma * EUR) / GBP).toFixed(0);

    var costsGBP = roundCost(totalConvert);
    console.log(costsGBP)
    if(c > 0){
       return costsGBP + ' GBP all in' 
    } else {
        return costsGBP + ' GBP'
    }
}


GenerateOffer.prototype.summary = function(){
    var costsPerKm;
    var delivery = this.deliveryTime(km, tt);
    if(currency == 'GBP'){
        var costsPerKm = this.convertMoney(km, stawka, ferry);
    } else {
        var costsPerKm = this.costs(km, stawka, ferry);
    }
    this.writeOffer(costsPerKm, delivery);
}

var vanText = document.querySelectorAll('.setVan');
var priceTxt = document.querySelectorAll('.setPrice');
var loadTxt = document.querySelectorAll('.setLoad');
var ttTxt = document.querySelectorAll('.setTT');


GenerateOffer.prototype.writeOffer = function(price, del){
    for(var a = 0; a < vanText.length; a++){
        vanText[a].innerHTML = typ;
        priceTxt[a].innerHTML = price; 
        loadTxt[a].innerHTML = timeToLoad;
        ttTxt[a].innerHTML = addCross(del, ferry);
    }
}

function addCross(val, fer){
    if(fer > 0){
        return val + ' hours + cross'
    } else{
        return val + ' hours'
    }
}


// TA FUNKCJA ZAOKRĄGLA W DÓŁ / GÓRĘ ZALEŻNIE OD OSTATNIEJ CYFRY
function roundCost(x){
    var arr = x.split('')
    var countArr = arr.length - 1;
    var lastDigit = parseFloat(arr[countArr])   
    if(lastDigit < 4){
        lastDigit = 0;
        var addDigit = lastDigit.toString();
        arr[countArr] = addDigit
    } else {
        lastDigit = 0;
        var y = parseFloat(arr[countArr - 1]);
        // jeśli przed ostatnia cyfra to 9
        if(y === 9){
            y = 0;
            var addDigit = lastDigit.toString();
            arr[countArr] = addDigit;
            var add = y.toString();
            arr[countArr - 1] = add;
            var firstDigit = parseFloat(arr[countArr - 2]);
            firstDigit++
            var firstDigitString = firstDigit.toString();
            arr[countArr - 2] = firstDigitString;
        // jeśli przedostatnia cyfra to nie jest 9
        } else{
            y++
            var addDigit = lastDigit.toString();
            arr[countArr] = addDigit
            var add = y.toString();
            arr[countArr - 1] = add
        }
    }
    var newArr = parseFloat(arr.join(''));
    return newArr
}


