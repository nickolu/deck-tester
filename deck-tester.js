(function($){
	
$(document).ready(function() {
	$.ajax({
		url : 'AllCards.json',
		success : function (data) {
			console.log('success!');
			window.dT = new deckTester(data);
			window.dT.init();
		},
		error : ''
	});
});

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

var deckTester = function(cardData) {
	var game = {}, i,
		zoneNames = ['hand','exile','library','graveyard','battlefield'];	
  	
  	cardData = cardData || {};
  	game.zones = {};
  	game.cardData = cardData;

  	for (i=0;i<zoneNames.length;i++) {
  		game.zones[zoneNames[i]] = [];
  	}

	game.init = function() {
		$('.btn').on('click',game.startGame);	
	};

	game.startGame = function() {
		var i;		
		
		for (i=0; i<cardData.length; i++) {
			game.zones.library.push(cardData[cardData[i]]);
		}

		game.buildLibrary();
		game.commands.shuffle(game.zones.library);
		game.commands.draw(7);
		game.updateAllZones();
	};

	game.buildLibrary = function(cards) {
		var cardName = '',
			amount = 0,
			i, j;

		// reset the zones
		for (var prop in game.zones) {
			if (game.zones.hasOwnProperty(prop)) {
				game.zones[prop] = [];	
			}
		}

		cards = cards || document.getElementById('deckList').value.replace(/\r\n/g, "\n").split("\n");
		// add cards to library
		for (i=0; i<cards.length; i++) {
			
			// split up the card name and quantity
			if (!isNaN(cards[i].charAt(0))) {  // check that the first char is a number
				
				cards[i] = cards[i].split(" ");
				amount = Number(cards[i][0]);

				cards[i].splice(0,1);
				cards[i] = cards[i].join(" ");	
				cardName = cards[i].toString().toProperCase();
				
				for (j=0; j<amount; j++) {
					if (cardData[cardName]) {
						game.zones.library.push(cardName);	
					} else {
						game.report.error(cardName+' not found');
					}
					
				}
			} else {
				// no quantity, just count it as one
				game.zones.library.push(cards[i].toString().toProperCase());
			}
		}
	};

	game.updateZone = function(zone) {
		var i, html, colors,
			container = $('.'+zone).find('ul');

    	zone = game.zones[zone] || [];
    	container.html('');
		
		for (i=0; i<zone.length; i++) {
			colors = "";
			if (cardData[zone[i]]) {
				colors = cardData[zone[i]]['colors'] || 'colorless';
				colors = (typeof colors == 'string') ? colors.replace(","," ") : colors.toString().replace(","," ");
				colors = colors.toLowerCase();
			} else {
				colors = 'no-data';
			}
			html = '<li class="card '+colors+'">'+zone[i]+'</li>';
			container.append(html);
		}
	};

	game.updateAllZones = function () {	
		var count = 0;
		for (var prop in game.zones) {
			if (game.zones.hasOwnProperty(prop)) {
				game.updateZone(zoneNames[count]);
				count++;
			}
		}
	}

	game.moveCard = function (fromZone, toZone, card) {
		var position = fromZone.indexOf(card);

		if (fromZone.length <= 0) {
			game.report.error('no cards in target zone')
		} else if (position >= 0) {
			fromZone.splice(position, 1);
			toZone.push(card);
		} else {
			game.report.error(card+' not found in target zone');
		}
		game.updateAllZones();
	};

	game.commands = {
		draw : function (amount) {
			for (var i=0; i<amount; i++) {
				game.moveCard(game.zones.library, game.zones.hand, game.zones.library[0]);
			}
		},
		shuffle : function (arr) {
		    var counter = arr.length, temp, index;
		    
		    while (counter > 0) {
		        index = Math.floor(Math.random() * counter);
		        counter--;
		        temp = arr[counter];
		        arr[counter] = arr[index];
		        arr[index] = temp;
			}

		    return arr;
		}
	};

	game.report = {
		allZones : function () {
			console.log('Current Status:');
			console.log('there are '+game.zones.hand.length+' cards in your hand');
			console.log('there are '+game.zones.graveyard.length+' cards in your graveyard');
			console.log('there are '+game.zones.library.length+' cards in your library');
			console.log('there are '+game.zones.battlefield.length+' cards in play');
			console.log('there are '+game.zones.exile.length+' cards in exile');
		},
		zone : function (zone) {
			var i;
			if (!game.zones[zone]) {
				console.log('please use a real zone');
				return;
			}
			for (i=0; i<game.zones[zone].length; i++) {
				console.log(game.zones[zone][i]);
			} 
		},
		cardDetails : function (card) {
			if (!cardData[card]) {
				game.report.error('card '+card+' not found');
				return;		
			}
			for (var prop in cardData[card]) {
				if (cardData.hasOwnProperty(card)) {
					console.log(prop+" : "+cardData[card][prop]);	
				}
			}

		},
		error : function (error) {
			console.log(error);
		}
	};

	game.test = {
		general : function () {
			var testLib = [
				'5 Dragon Hatchling',
				'3 Felix the cat',
				'2 tyrannosaur'
			];
			game.buildLibrary(testLib);
			game.commands.draw(7);
			game.report.allZones();
			game.report.cardDetails(game.zones['hand'][0]);
			game.commands.shuffle(game.zones['hand']);
			game.updateAllZones();
			game.report.cardDetails(game.zones['hand'][0]);

		}
	}

	return game;
};

}(jQuery));

