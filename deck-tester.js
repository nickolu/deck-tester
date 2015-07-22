(function($){
	
$(document).ready(function() {
	$.ajax({
		url : 'AllCards.json',
		success : function (data) {
			console.log('success!');
			window.dT = new DeckTester(data);
			window.dT.init();
		},
		error : ''
	});
});

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

var DeckTester = function(cardData) {
	var game = {}, i,
		zoneNames = ['hand','exile','library','graveyard','battlefield'];	
  	
  	cardData = cardData || {};
  	game.zones = {};
  	game.cardData = cardData;

	game.init = function() {
		$('.btn').on('click',game.startGame);	
		game.cardEvents = new CardEvents();
		game.clearZones();
	};

	game.startGame = function() {
		var i;		
		
		for (i=0; i<cardData.length; i++) {
			game.zones.library.cards.push(cardData[cardData[i]]);
		}

		game.buildLibrary();
		game.commands.shuffle(game.zones.library.cards);
		game.commands.draw(7);
		game.updateAllZones();
	};

	game.clearZones = function() {
		for (i=0;i<zoneNames.length;i++) {
			game.zones[zoneNames[i]] = {
				name : zoneNames[i],
				cards : []
			};
		}
	};

	game.buildLibrary = function(cards) {
		var cardName = '',
			amount = 0,
			i, j;

		// reset the zones
		game.clearZones();

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
						game.zones.library.cards.push(cardName);	
					} else {
						game.report.error(cardName+' not found');
					}
					
				}
			} else {
				// no quantity, just count it as one
				game.zones.library.cards.push(cards[i].toString().toProperCase());
			}
		}

		game.cardEvents.init();
		
	};

	game.updateZone = function(zone) {
		var i, html, colors,
			container = $('.'+zone).find('ul');

    	zoneCards = game.zones[zone].cards || [];
    	container.html('');
		
		for (i=zoneCards.length-1; i>0; i--) {
			colors = "";
			if (cardData[zoneCards[i]]) {
				colors = cardData[zoneCards[i]]['colors'] || 'colorless';
				colors = (typeof colors == 'string') ? colors.replace(","," ") : colors.toString().replace(","," ");
				colors = colors.toLowerCase();
			} else {
				colors = 'no-data';
			}
			html = '<li class="card '+colors+'" data-card-name="'+zoneCards[i]+'" data-card-zone="'+game.zones[zone].name+'" data-card-index="'+i+'">'+zoneCards[i]+'</li>';
			container.append(html);
		}

		game.cardEvents.init();
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
		var position = fromZone.cards.indexOf(card);

		if (fromZone.length <= 0) {
			game.report.error('no cards in '+fromZone.name)
		} else if (position >= 0) {
			fromZone.cards.splice(position, 1);
			toZone.cards.push(card);
		} else {
			game.report.error(card+' not found in '+fromZone.name);
		}
		game.updateAllZones();
	};

	game.commands = {
		draw : function (amount) {
			for (var i=0; i<amount; i++) {
				game.moveCard(game.zones.library, game.zones.hand, game.zones.library.cards[0]);
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
			console.log('there are '+game.zones.hand.cards.length+' cards in your hand');
			console.log('there are '+game.zones.graveyard.cards.length+' cards in your graveyard');
			console.log('there are '+game.zones.library.cards.length+' cards in your library');
			console.log('there are '+game.zones.battlefield.cards.length+' cards in play');
			console.log('there are '+game.zones.exile.cards.length+' cards in exile');
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
			game.report.cardDetails(game.zones.hand.cards[0]);
			game.commands.shuffle(game.zones.hand.cards);
			game.updateAllZones();
			game.report.cardDetails(game.zones.hand.cards[0]);
		}
	};

	return game;
};

var CardEvents = function() {
	var pub = {},
		$window = $(window)

	pub.card = {};
	pub.mousePosition = {};

	pub.init = function() {
		$('.card').off('mousedown',pub.bindCardToMouse);
		$('.card').on('mousedown',pub.bindCardToMouse);

		$('.card').off('mouseup',pub.unbindCardToMouse);
		$('.card').on('mouseup',pub.unbindCardToMouse);

		var throttled = {
			checkForMouseInZones : _.throttle(pub.checkForMouseInZones, 0),
			buildZoneAreas : _.throttle(pub.buildZoneAreas, 0)
		} 

		pub.buildZoneAreas();
		$window.on('resize',throttled.buildZoneAreas)
		$window.on('mousemove',throttled.checkForMouseInZones);
	};

	pub.bindCardToMouse = function (e) {
		pub.card = $(e.target);
		$window.on('mousemove', pub.moveCard)
	};

	pub.unbindCardToMouse = function() {
		var targetZone = pub.checkForMouseInZones(),
			sourceZone = pub.card.attr('data-card-zone'),
			index = pub.card.attr('data-card-index'),
			cardName = pub.card.attr('data-card-name')
		console.log(sourceZone+" "+cardName);
		$window.off('mousemove', pub.moveCard);
		
		if (pub.checkForMouseInZones()) {
			dT.moveCard(dT.zones[sourceZone], dT.zones[targetZone], dT.zones[sourceZone].cards[index]);
			
		}
		dT.updateZone(targetZone);
		dT.updateZone(sourceZone);
		
		pub.card = {};
	};

	pub.moveCard = function (e) {
		pub.card.css('transition','none');
		pub.card.offset({top: e.pageY-90, left: e.pageX-50});
		pub.mousePosition = {
			x : e.pageX,
			y : e.pageY
		};
	};

	pub.reportCardZone = function (zone) {
		var zoneAreas = {
			width : $('.'+zone).width(),
			height : $('.'+zone).height(),
			left : $('.'+zone).offset().left,
			top : $('.'+zone).offset().top
		}

		return zoneAreas;
	}

	pub.buildZoneAreas = function () {
		if (!dT.zones) {return};
		for (var prop in dT.zones) {
			if (dT.zones.hasOwnProperty(prop)) {
				dT.zones[prop].edgeL = pub.reportCardZone(dT.zones[prop].name).left;
				dT.zones[prop].edgeR = pub.reportCardZone(dT.zones[prop].name).left + pub.reportCardZone(dT.zones[prop].name).width;
				dT.zones[prop].edgeT = pub.reportCardZone(dT.zones[prop].name).top;
				dT.zones[prop].edgeB = pub.reportCardZone(dT.zones[prop].name).top + pub.reportCardZone(dT.zones[prop].name).height;
			}
		}
	}

	pub.checkForMouseInZones = function (e) {
		var mouseX = (!e) ? pub.mousePosition.x : e.pageX,
			mouseY = (!e) ? pub.mousePosition.y : e.pageY,
			activeZone = $('.active'),
			prop;

		for (prop in dT.zones) {
			var edgeL = dT.zones[prop].edgeL,
				edgeR = dT.zones[prop].edgeR,
				edgeT = dT.zones[prop].edgeT,
				edgeB = dT.zones[prop].edgeB;

			if (mouseX > edgeL && mouseX < edgeR && mouseY > edgeT && mouseY < edgeB) {
				activeZone.removeClass('active');
				$('.'+dT.zones[prop].name).addClass('active');
				return prop;
			} else {
				$('.'+dT.zones[prop].name).removeClass('active');
			}
		}
			
		return false;
	};

	return pub;
};

}(jQuery));

