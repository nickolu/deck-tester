/**
*	Deck Tester
*	author: Nick Cunningham
*	email: nickolusroy@gmail.com
*	license: whatever
*	
*	a javascript application for playtesting magic decks
*
*
*/


(function($){

"use strict";

$(document).ready(function() {
	$.ajax({
		url : 'AllCards.json',
		success : function (cardJson) {
			console.log('success!');
			window.dT = new DeckTester(cardJson);
			window.dT.init();
		},
		error : ''
	});
});


/**
* converts a string to Proper Case
*/

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

/***
*	Represents a virtual solitaire game of magic the gathering
*	@constructor
*	@param {object} cardJson - card database
*/
var DeckTester = function(cardJson) {
	var i, game = {}, 
		zoneNames = ['hand','exile','library','graveyard','battlefield'];	
  	
  	game.cardJson = cardJson || {}; 
  	game.zones = {};
  	game.deck = [];
  	
  	game.options = {
  		allowUserCards : true,
  		useTestData : true
  	};

  	/**
  	 * setup the game
  	 */
	game.init = function() {
		$('.btn').on('click',game.startGame);	
		game.cardEvents = new CardEvents();
		game.initZones();
	};
	/**
	 * start the game
	 */
	game.startGame = function() {
		var i;		

		game.buildLibrary();
		game.commands.shuffle(game.zones.library.cards);
		game.updateAllZones();
	};
	/**
	 * create a zone array for each item in zoneNames
	 */
	game.initZones = function() {
		for (i=0;i<zoneNames.length;i++) {
			game.zones[zoneNames[i]] = {
				name : zoneNames[i],
				cards : []
			};
		}
	};

	/**
	 * creates the initial library for the game from an array of strings representing cards in the library
	 * a card name can be preceded by a number representing the quantity of that card, otherwise it will be counted as one card
	 *
	 * if an array is provided as an argument it will be used for the library, otherwise it will build an array from the values in the input box
	 *
	 * 
	 * @param  {array} array of strings representing cards in the library
	 * @return {[type]}       [description]
	 */
	game.buildLibrary = function(cards) {
		var cardName = '',
			qty = 0,
			i, j;

		game.initZones();

		cards = cards || document.getElementById('deckList').value.replace(/\r\n/g, "\n").split("\n") || []; 

		if (game.options.useTestData) {
			cards = [
				'20 dragon hatchling',
				'20 forest',
				'20 counterspell'
			]
		}
		
		for (i=0; i<cards.length; i++) {

			if (!isNaN(cards[i].charAt(0))) {  // if the first character is a number (quantity for this card)
				
				// separate the card name and qty value 
				cards[i] = cards[i].split(" "); 
				qty = Number(cards[i][0]); 
				cards[i].splice(0,1); 
				cards[i] = cards[i].join(" "); 
				cardName = cards[i].toString().toProperCase();
				
				if (cardJson[cardName] || game.options.allowUserCards) {
					for (j=0; j<qty; j++) {
						game.zones.library.cards.push(cardName);
					}
				} else {
					game.report.error(cardName+' not found');
				}
			} else {
				// no quantity provided, so we'll count this as a single card
				cardName = cards[i].toString().toProperCase()
				if (cardJson[cardName]) {
					game.zones.library.cards.push(cardName);	
					game.deck.push(cardName);
				}
				
			}
		}

		// reset the card events
		game.cardEvents.init();
		
	};
	
	/**
	* clears each zone and replaces them with the correct cards
	* @param {string} zone - name/id of target zone
	*/

	game.updateZone = function(zone) {
		var i, html, colors, card,
			container = $('.'+zone).find('ul'),
			htmlCards = container.find('.card-container'), // DOM cards in this zone
			zoneCards = game.zones[zone].cards || []; // cards that should be in the zone

    	// clear the current zone (in the DOM)
    	container.empty();
		
		// traverse through cards in this zone array backwards
		for (i=zoneCards.length-1; i>=0; i--) {
			colors = getColors(i);
			html = '<li class="card-container"><span class="card '+colors+'" data-card-name="'+zoneCards[i].replace(' ','-').toLowerCase()+'" data-card-zone="'+game.zones[zone].name+'" data-card-index="'+i+'">'+zoneCards[i]+'</span><span class="tap">T</span></li>';	
			container.append(html);
		}

		/**
		 * gets the colors for a card in this zone
		 * @param  {number} index -- index of the card in this zone
		 * @return {string} -- string of colors separated by spaces
		 */
		function getColors(index) {
			var theColors = 'no-data';
			
			if (cardJson[zoneCards[i]]) {
				theColors = cardJson[zoneCards[i]]['colors'] || 'colorless'; // if unspecified color, colorless
				theColors = (typeof theColors == 'string') ? theColors.replace(","," ") : theColors.toString().replace(","," "); 
				theColors = theColors.toLowerCase(); 
			} 

			return theColors;
		}

		// reset event listeners on cards
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

	game.moveCard = function (fromZone, toZone, cardName) {
		var position = fromZone.cards.indexOf(cardName),
			container = $('.'+toZone.name).find('ul'),
			htmlCards, htmlCard, cardAttr;
			
		cardAttr = cardName.replace(' ','-').toLowerCase();
		htmlCards = container.find('[data-card-name='+cardAttr+']').closest('.card-container');
		htmlCard = $(htmlCards[0]).detach();		
		
		if (fromZone.length <= 0) {
			game.report.error('no cards in '+fromZone.name)
		} else if (position >= 0) {
			fromZone.cards.splice(position, 1);
			toZone.cards.splice(0,0,cardName);
			htmlCard.appendTo(container);
		} else {
			game.report.error(cardName+' not found in '+fromZone.name);
		}	

		game.cardEvents.init();
	};

	game.commands = {
		draw : function (amount) {
			for (var i=0; i<amount; i++) {
				game.moveCard(game.zones.library, game.zones.hand, game.zones.library.cards[0]);
			}
		},
		newGame : function () {
			game.startGame();
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
			for (i=0; i<game.zones[zone].cards.length; i++) {
				console.log(i+1+'. '+game.zones[zone].cards[i]);
			} 
		},
		cardDetails : function (card) {
			if (!cardJson[card]) {
				game.report.error('card '+card+' not found');
				return;		
			}
			for (var prop in cardJson[card]) {
				if (cardJson.hasOwnProperty(card)) {
					console.log(prop+" : "+cardJson[card][prop]);	
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
		},
		sequence : {
			1 : function() {
				game.moveCard(game.zones.hand.cards, game.zones.battlefield.cards, game.zones.hands.cards[0]);
				game.updateAllZones();
				game.report.allZone();
			},
			2 : function() {
				game.moveCard(game.zones.hand.cards, game.zones.battlefield.cards, game.zones.hands.cards[0]);
				game.report.allZones();
			}
		}
		
	};

	return game;
};

var CardEvents = function() {
	var pub = {},
		$window = $(window);

	pub.card = {};
	pub.mousePosition = {};

	pub.init = function() {
		var tapControl = $('.library').find('.card').find('.tap'),
			gameCard = $('.card').filter(function(){
			if (!$(this).parent('.battlefield').length) {
				return true;
			}
		});

		$('.card-container').on('dblclick',function(){
			if (!($(this).hasClass('tapped'))) {
				$(this).addClass('tapped');
			} else {
				$(this).removeClass('tapped');
			}
		});

		gameCard.off('mousedown',pub.bindCardToMouse);
		gameCard.on('mousedown',pub.bindCardToMouse);

		gameCard.off('mouseup',pub.unbindCardToMouse);
		gameCard.on('mouseup',pub.unbindCardToMouse);


		var throttled = {
			checkForMouseInZones : _.throttle(pub.checkForMouseInZones, 0),
			buildZoneAreas : _.throttle(pub.buildZoneAreas, 0)
		} 

		pub.buildZoneAreas();
		$window.on('resize',throttled.buildZoneAreas)
		$window.on('mousemove',throttled.checkForMouseInZones);
	};

	pub.tap = function (e) {
		var card = $(e.target).parent('.card');

		if (!card.hasClass('tapped')) {
			card.addClass('tapped');
		} else {
			card.removeClass('tapped');
		}
		e.stopPropagation();
	},

	pub.bindCardToMouse = function (e) {
		pub.card = $(e.target);
		if (!$(e.target).hasClass('card')) {
			return;
		}
		
		pub.card.addClass('active-card');
		$window.on('mousemove', pub.moveCard)
		e.stopPropagation();
	};

	pub.unbindCardToMouse = function() {
		if (!pub.card.hasClass('card')) {return};
		
		var targetZone = pub.checkForMouseInZones(),
			sourceZone = pub.card.attr('data-card-zone'),
			index = pub.card.attr('data-card-index'),
			cardName = pub.card.attr('data-card-name');

		pub.card.removeClass('active-card');
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

