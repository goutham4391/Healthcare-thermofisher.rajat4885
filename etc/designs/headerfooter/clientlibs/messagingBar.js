/*
	Drives the global customer messaging bar
	Allows you to pass TEXT or a jQuery object to be appended
*/
var messagingBar = {

	_self: false,
	initted: false,

	hasMessages: false,

	messages: $('<div></div>'),
	sep: '<span class="messaging-bar-seperator">|</span>',
	$template: $('<div id="messagingBar"><div id="messagingBarContainer" class="container"><div id="messagingBarContent"></div></div></div>'),
	$messagingBarContent: null, //placeholder

	/*
		Adds the messaging bar HTML and body class to the page if not already innitted
	*/
	init: function(){
		if ( !this.initted ) {

			// Do not init if global header is not present on page
			if ( $('.global-commerce-bar').length > 0 ) {

				_self = this;

				this.initted = true;
				var $body = $('body');

				$body.addClass('has-messaging-bar').append(this.$template);
				$body.removeClass('no-messaging-bar');
				this.$messagingBarContent = $('#messagingBarContent',this.$template);

				if ( getCookie(this.promosCookieName) == 'Y' ) this.promosMuted = true;

			} else {
				return false;
			}

		}

		return true;
	},

	/*
		Expects a STRING or jQuery object
		Wraps text in a span tag and adds it to our messages object, then builds the messaging bar HTML
	*/
	addMessage: function(text){
		this.hasMessages = true;
		this.addContent(text,'messages');
	},

	/*
		TODO: This should be removed mid 2017
		Promo functionality was cut out of messaging bar as part of responsive project
	*/
	addPromo: function(){
		return false;
	},

	addMessageFirst: function(text){
		this.hasMessages = true;
		this.addContent(text,'messages',true);
	},

	addContent: function(text, which, addPrepend){
		if ( text ) {
			if ( this.init() ) {
				if ( typeof text == "string" ) text = $('<span>'+text+'</span>');
				text = text.wrap('<span class="messaging-bar-snippet"></span>').parent();

				if ( this[which].children().length > 0 ) {
					if ( addPrepend ) this[which].prepend(this.sep);
					else this[which].append(this.sep);
				}

				if ( addPrepend ) this[which].prepend(text);
				else this[which].append(text);

				this.display();
			}
		}
	},

	display: function(){

		if ( this.hasMessages ) {
			this.$messagingBarContent
				.html(this.messages);
		} else {

			this.initted = false;
			var $body = $('body');

			$body.removeClass('has-messaging-bar');
			$body.addClass('no-messaging-bar');
			$('#messagingBar',$body).remove();
		}

	},

	clearMessages: function(){
		this.hasMessages = false;
		this.messages.children().remove();
		this.display();
	},

	clearAll: function(){
		this.hasPromos = false;
		this.hasMessages = false;
		this.messages.children().remove();
		this.display();
	}

};
