//following functions are required by minicart.js

function getIsB2B() {
	var displayType = _lt.user.displayType;
	if(displayType.indexOf("b2b") != -1 && displayType.indexOf("cmgt") != -1) return true;
	else return false;
}
function getDisplayType() {
	return _lt.user.getInfo('displayType',false);
}

function getIsLoggedIn() {
	return _lt.user.isLoggedIn;
}

function IeMondrianLinkDisplay(){
    //$.browser will be deprecated on jquery >1.9.1
    if($.browser && parseInt($.browser.version) <= 10){
        $('.mondrian-module-list UL LI .btn-flat').addClass('is-ie-nine')
    }
}

$(document).ready(function(){
    IeMondrianLinkDisplay()
});

//this function definition is required here called by rawHTML at order-support-change-location (Change-location)
 
function isB2bDisplayType() {
	return _lt.displayTypeMatch('B2B');
}
$(document).ready(function(){
	// get element
	var dimbg = $('.dim-background');
	if(!dimbg.length)
	{
		dimbg = $('<div class="dim-background" />').appendTo($('.globalHeader'));
    }
	// bindings
	var dimBgOperations = {
		bindings: function(elem){
            $(elem).bind('opendimbg', function(){
                elem.addClass('active');
            });
            $(elem).bind('closedimbg', function(event){
				if(!$('.minicart-toggle').hasClass('active') && !$('#meganav-content li').hasClass('active') && !$('#header-typeahead').is(':visible') && !$('#myaccount-div').hasClass('in')) {
					elem.removeClass('active');
				}
            });
            $('#miniCartButton').bind('mouseenter', function(){
                var cartTotal = parseInt($('#miniCartHeaderTotalItems').text(),10);
                if(!isNaN(cartTotal) && cartTotal > 0){
                    elem.trigger('opendimbg');
                }
            });
            $('#miniCartButton').bind('mouseleave', function(){
                elem.trigger('closedimbg');
            });
		}
	}
    dimBgOperations.bindings(dimbg);
    document.addEventListener('searchEvent', function(event) {
        if (event.detail.searchEventDetail) {
            if (event.detail.searchEventDetail==='showResults'){
                $('.dim-background').trigger('opendimbg');
            }else if((event.detail.searchEventDetail==='hideSuggestion')){
                $('.dim-background').trigger('closedimbg');
            }
        }
    });
});

// controls dim background on header for commerce utility bar and account dropdown
function hideOpenHeaderPanels(){

	$active = $('.global-commerce-bar .in, #header-nav-container .in, .global-commerce-bar .active, #header-nav-container .active');
	$body = $('body').removeClass('header-nav-in').removeClass('header-nav-l1-in').removeClass('header-nav-l2-in');
	

	if ( arguments && arguments.length > 0 ) {
		for ( var i = 0; i < arguments.length; i++ ) {
			$active = $active.not(arguments[i]);
		}
	}

	if ( window.miniCart ) miniCart.hideCart();
	
	$active.removeClass('in').removeClass('active');
}

function toggleHeaderElementHandler($elm, $par){

	var $body = $('body');
	var selector = $elm.attr('data-target');
	var $target = $(selector);

	if ( $elm.hasClass('active') ) {
		$elm.removeClass('active');
		$target.removeClass('in');
		$('.dim-background').trigger('closedimbg');
	} else {
		$elm.addClass('active');
		$target.addClass('in');
		$('.dim-background').trigger('opendimbg');
	}

	var $nav = $elm.closest('#header-nav-container');
	if ( $nav.length === 0 ){
		$body.removeClass('header-nav-in');
	}

	hideOpenHeaderPanels($elm, $target, $par);

}

var ltHeader = new function(){

    this.init = function(){
        // do not fire any of this if header/footer not present
        if ( window.globalHeaderConfig ) {
            this.setupLinks();
            this.defaultCookies();
            this.hideRegisterBasedOnCountry();
            this.showAppropriateScmsElements();

            // Allows certain pages to hide the miniCart by utilizing a ltHeader config object
            if (window.ltHeaderConfig) {
                if (ltHeaderConfig.minicart === false) {
                    ltHeader.hideMiniCart();
                }
            }
        }
    };

	this.setupLinks = function(){

		var globalHeaderConfig = window.globalHeaderConfig;

		this.scmsEuLogoLinkHref = globalHeaderConfig.scmsEuLogoLinkHref;
		this.scmsEuLogoImagePath = globalHeaderConfig.scmsEuLogoImagePath;
		this.scmsEuLogoImagePrintPath = globalHeaderConfig.scmsEuLogoImagePrintPath;
		this.scmsShipToLabLogoLinkHref = globalHeaderConfig.scmsShipToLabLogoLinkHref;
		this.scmsShipToLabLogoImagePath = globalHeaderConfig.scmsShipToLabLogoImagePath;
		this.scmsShipToLabLogoImagePrintPath = globalHeaderConfig.scmsShipToLabLogoImagePrintPath;
		this.scmsEuShipToLabLogoLinkHref = globalHeaderConfig.scmsEuShipToLabLogoLinkHref;
		this.scmsEuShipToLabLogoImagePath = globalHeaderConfig.scmsEuShipToLabLogoImagePath;
		this.scmsEuShipToLabLogoImagePrintPath = globalHeaderConfig.scmsEuShipToLabLogoImagePrintPath;

		this.scmsNavLinkTextForEU = globalHeaderConfig.scmsNavLinkTextForEU;
		this.scmsNavUnlockLinkTextForEU = globalHeaderConfig.scmsNavUnlockLinkTextForEU;
		this.scmsNavChangeLocationLinkTextForEU = globalHeaderConfig.scmsNavChangeLocationLinkTextForEU;
		this.scmsNavSetStartPageLinkTextForEU = globalHeaderConfig.scmsNavSetStartPageLinkTextForEU;
		this.scmsNavSupplyCenterHomeLinkTextForEU = globalHeaderConfig.scmsNavSupplyCenterHomeLinkTextForEU;
		this.scmsNavSupplyCenterHomeForLabLinkTextForEU = globalHeaderConfig.scmsNavSupplyCenterHomeForLabLinkTextForEU;

		this.utilityBarSignInForwardLinkHref = globalHeaderConfig.utilityBarSignInForwardLinkHref;
		
	};

	//If in author mode the CK_ISO_CODE and CK_LANG_CODE are not set automatically
	this.defaultCookies = function(){
		if (!getCookie('CK_ISO_CODE')) {
			setCookie('CK_ISO_CODE','us');
		}
		else if (!getCookie('CK_LANG_CODE')) {
			setCookie('CK_LANG_CODE','en');
		}
	};

	//sets up an object that defines publicly accessible functions that can be used to modify the syndicated header
	//NOTE: this object comprises an API that is used inside and outside the header
	this.hideMiniCart = function(){
		//hides the minicart button in the commerce utility bar
		hideElementById("miniCartButton");
	};

	this.hideMyCustomProducts = function(){
		//hides the "My Custom Products" menu item in the commerce utility bar under the "my account" menu
		hideElementById("hfMyCustomProductsLi");
	};

	this.hideMySettings = function(){
		//hides the "My Settings" menu item in the commerce utility bar under the "my account" menu
		hideElementById("hfMySettingsLi");
	};

	this.hideMyAccountOptions = function(){
		//hides the "My Account Drop downs" menu item in the commerce utility bar
		hideElementById("hfMyAccountOptions");
	};

	this.hideRegister = function(){
		//hides the "Register" menu item in the commerce utility bar
		hideElementById("hfRegisterLi");
	};

	this.hideScmsMenu = function(){
		hideElementById("scms-home");
		hideElementById("hfScmsSettings");
		hideElementById("scms-unlock");
		hideElementById("scms-change-location");
		hideElementById("scms-set-start");
	};

	this.hideScmsHomeForScLink = function(){
		hideElementById("hfScmsHomeLink");
	};

	this.hideScmsChangeLocationLink = function(){
		hideElementById("scms-change-location");
	};

	this.hideScmsAlertIcons = function(){
		hideElementsByClassName("scms-alert-icon");
	};

	this.hideScmsStartPageLink = function(){
		hideElementById("scms-set-start");
	};

	this.hideScmsUnlock = function(){
		hideElementById("scms-unlock");
	};
    
    this.showChangeOrderLink = function(){
	    var htmlData = $('#changeOrder').html();
	    messagingBar.addMessage(htmlData);
	};
    
	this.showScmsShipToLab = function(){
		messagingBar.addMessage('<span id="hfScmsShipToLab"></span>'+localizedStrings.SCMS_SHIP_TO_LAB);
	};

	this.showScmsShipToSC = function(isEu){

		var scidText = getUnescapedCookie("scidSCName");
		
		var titleText = localizedStrings.SCMS_SHIP_TO_SC;
		if ( isEu ) titleText = localizedStrings.SCMS_SHIP_TO_SC_FOR_EU;

		var hfScmsShipToSC = '<span id="hfScmsShipToSC"></span>'+titleText+'<span id="hfScmcShipToSCText">: '+scidText+'</span>';
		messagingBar.addMessage( hfScmsShipToSC );

	};

	this.showScmsShipToSCForEU = function(){
		this.showScmsShipToSC(true);
	};

	this.showScmsHomeForLabLink = function(){
		showElementById("hfScmsHomeForLabLink");
	};

	this.hideRegisterBasedOnCountry = function(){
		var isoCode = _lt.user.getInfo('displayIso','us');
		if ( !window.ltCountryInfo || stringEqualsIgnoreCase(ltCountryInfo[isoCode].registerHidden, 'true')){
			this.hideRegister();
		}
	};

	this.getCustInfoDisplayType = function() {

		var ckCustInfo = getCookie('CK_CUSTOMER_INFO');
		var arr = ckCustInfo.match(/displayType(?:%3A|\:)([a-zA-Z]*)/i);

		// if there was a match, arr should be like ['displayType:cmgtpscms','cmgtpscms']
		if(arr) {
			var displayType = arr[1];
			// displayType should be something like cmgtpscms
			return displayType;
		}
		// fallback to CK_DISPLAY_TYPE
		return getCookie('CK_DISPLAY_TYPE');
	}

	this.showAppropriateScmsElements = function(){

		var displayType = getCookie("CK_DISPLAY_TYPE");
		var scShipType = getCookie("scShipType");
		var scStartPage = getCookie("scStartPage");
		var scList = getCookie("scList");
		var displayChangeSC = getCookie("displayChangeSC");
		var isScKiosk = getCookie("ISSCKIOSK");
		var isSecuredStorageAccess = getCookie('isSecuredStorageAccess');
		var isoCode = getCookieOrDefault("CK_ISO_CODE", "us");
		var scCustomerId = getCookie('CUSTOMERID');
		var scChangeLocationUrl = $('#scms-change-location').find('a').attr('href') + scCustomerId + "#changeSCLocation";
		var scSetStartPage = $('#scms-set-start').find('a').attr('href')+"&UserKey=" + scCustomerId + "#SCLocationSelected";
		var euCountry = window.ltCountryInfo && ltCountryInfo[isoCode].euCountry;

		if (stringEqualsIgnoreCase(displayType, 'cmgtsc') || stringEqualsIgnoreCase(displayType, 'cmgtpscms') || stringEqualsIgnoreCase(displayType, 'pscmsmaster'))
		{
			if(stringEqualsIgnoreCase(scShipType, "SC"))
			{
				if (stringEqualsIgnoreCase(euCountry, 'true'))
				{
					$("#hfLifetechLogoLink").attr('href', this.scmsEuLogoLinkHref);
					$("#hfLifetechLogoImage").attr('src', this.scmsEuLogoImagePath);
					$("#hfLifetechLogoPrintImage").attr('src', this.scmsEuLogoImagePrintPath);

					$("#hfScmsMenuLinkText").text(this.scmsNavLinkTextForEU);
					$("#hfScmsUnlockLink").text(this.scmsNavUnlockLinkTextForEU);
					$("#hfScmsChangeLocationLink").text(this.scmsNavChangeLocationLinkTextForEU);
					$("#hfScmsSetStartLink").text(this.scmsNavSetStartPageLinkTextForEU);
					$("#hfScmsHomeLink").text(this.scmsNavSupplyCenterHomeLinkTextForEU);

					this.showScmsShipToSCForEU();
				}
				else
				{
					this.showScmsShipToSC();
				}
			}
			else if (stringEqualsIgnoreCase(scShipType, 'LAB') || !scShipType)
			{
				if (stringEqualsIgnoreCase(euCountry, 'true'))
				{
					$("#hfLifetechLogoLink").attr('href', this.scmsEuShipToLabLogoLinkHref);
					$("#hfLifetechLogoImage").attr('src', this.scmsEuShipToLabLogoImagePath);
					$("#hfLifetechLogoPrintImage").attr('src', this.scmsEuShipToLabLogoImagePrintPath);

					$("#hfScmsMenuLinkText").text(this.scmsNavLinkTextForEU);
					$("#hfScmsUnlockLink").text(this.scmsNavUnlockLinkTextForEU);
					$("#hfScmsChangeLocationLink").text(this.scmsNavChangeLocationLinkTextForEU);
					$("#hfScmsSetStartLink").text(this.scmsNavSetStartPageLinkTextForEU);
					$("#hfScmsHomeForLabLink").text(this.scmsNavSupplyCenterHomeForLabLinkTextForEU);
				}
				else
				{
					$("#hfLifetechLogoLink").attr('href', this.scmsShipToLabLogoLinkHref);
					$("#hfLifetechLogoImage").attr('src', this.scmsShipToLabLogoImagePath);
					$("#hfLifetechLogoPrintImage").attr('src', this.scmsShipToLabLogoImagePrintPath);
				}

				if (stringEqualsIgnoreCase(displayType, 'cmgtpscms'))
				{
					//this.hideScmsMenu();
					this.hideScmsUnlock();
					this.hideScmsStartPageLink();
					this.hideScmsChangeLocationLink();
					hideElementById("scms-home");
					hideElementById("hfScmsSettings");
				}
				else
				{
					this.hideScmsHomeForScLink();
					this.showScmsHomeForLabLink();
					this.showScmsShipToLab();
				}
			}
			if( $('#changeOrder').length ){
				this.showChangeOrderLink();
			}
		}

		if (!scStartPage || stringEquals(scStartPage, '0'))
		{
			this.hideScmsStartPageLink();
		}
		else
		{
			$('#scms-set-start').find('a').attr("href", scSetStartPage);
		}

		if (!displayChangeSC || stringEquals(displayChangeSC, '0') || !scList || stringEquals(scList, '0'))
		{
			this.hideScmsChangeLocationLink();
		}
		else
		{
			$('#scms-change-location').find('a').attr("href", scChangeLocationUrl);
		}

		if (!isScKiosk || stringEquals(isScKiosk, '0') || !isSecuredStorageAccess || stringEquals(isSecuredStorageAccess, '0'))
		{
			this.hideScmsAlertIcons();
			this.hideScmsUnlock();
		}
		if (stringEqualsIgnoreCase(displayType, 'scmscfg')) {
			var SCMSPartnerLogoPath = getCookie('SC_PARTNER_LOGO');
			if (SCMSPartnerLogoPath) {
				//insert JHU logo for usertype scmscfg
				document.getElementById("SCPartnerLogoImage").setAttribute('src', SCMSPartnerLogoPath);
			}
		}

		};

	this.syncHomeBreadcrumbLink = function(){
		return false;
		//This has been deprecated
	};

	function validUrl(url) {
		var validUrl = true;

		//validate URL is string, not empty  and starts with HTTP:// or HTTPS://
		if (    (typeof url !== 'string') ||  !url.match(/^http(s)?:\/\//gi)     )
		{
			validUrl = false;
		}
		return validUrl;
	}

	function hideElementById(idString) {
		$('#'+idString).hide();
	}

	function showElementById(idString) {
		$('#'+idString).show();
	}

	function hideElementsByClassName(className) {
		$('.'+className).hide();
	}

	function getCookieOrDefault(name, defaultVal) {
		var cookieVal = getCookie(name);
		if (!cookieVal)
		{
			cookieVal = defaultVal;
		}
		return cookieVal;
	}

	function getUnescapedCookie(name) {
		var cname = name + '=';
		var dc = document.cookie;
		if (dc == null) return '';
		if (dc.length > 0)
		{
			var begin = dc.indexOf(cname);
			if (begin != -1)
			{
				begin += cname.length;
				var end = dc.indexOf(';', begin);
				if (end == -1) end = dc.length;
				return unescape(dc.substring(begin, end));
			}
		}
		return '';
	}

	function stringEquals(s1, s2){
		return s1 && s1 === s2;
	}

	function stringEqualsIgnoreCase(s1, s2){
		return s1 && s2 && s1.toUpperCase() === s2.toUpperCase();
	}
	
};

window.performance && window.performance.mark && window.performance.mark("headerFooter.js:blockBegin");

ltHeader.init();


/*
	Boolean check to determine if current page is responsive
	We can assume that if 'viewport' meta tag is present then page is responsive
*/
ltHeader.isResponsive = function(){
	// Even if we have viewport tag, IE8 wont support.
	// This can go away.. eventually
	// Lazy IE8 check
	var isIE8 = window.attachEvent && !window.addEventListener;

	return !isIE8 && $('meta[name="viewport"]').length > 0;
};


/*
	Gives you current viewport size
	Returns 'lg' if not responsive
*/
ltHeader.getCurrentViewportSize = function(){

	var which = 'lg';

	if ( ltHeader.isResponsive() ) {

		which = 'xl';
		var breakpoints = {
		    lg: 1200,
		    md: 980,
		    sm: 768,
		    xs: 480
		};

		var width = $(window).width();
		for ( var w in breakpoints ) {
		    if ( width < breakpoints[w] ) which = w;
		}

	}

	return which;

};

(function viewportWatchers(){

	var $document = $(document);
	var $window = $(window);
	var currentViewportSize = ltHeader.getCurrentViewportSize();


	function detectViewportChange(){
        var newViewportSize = ltHeader.getCurrentViewportSize();
        if ( newViewportSize != currentViewportSize ) {
            currentViewportSize = newViewportSize;
            $document.trigger('viewport-change');
        }
    }

	if ( ltHeader.isResponsive() ) {

	    var resizeTimeout;

	    $window.bind('resize',function(){
	        clearTimeout(resizeTimeout);
	        resizeTimeout = setTimeout(detectViewportChange,200);
	    });

	    $document.bind('viewport-change',function(){
		    var newViewport = ltHeader.getCurrentViewportSize();
		    console.log('viewport-change',newViewport);
		});
	}

})();

