
// Hide Redeem a Quote link from footer for Israel and Thailand countries
$(document).ready(function(){
    var blocked = ["il", "th"];
    var country_code = getCookie('CK_ISO_CODE');
    if(country_code !== null && country_code !== '' && country_code !==undefined){
        if($.inArray(country_code, blocked) != -1) {
            $('.redeem-quote').hide();
        }
    }
});


function textReplacement(input, button){
	var placeholderSupport = ("placeholder" in document.createElement("input"));
	var originalvalue = '';

	if (!placeholderSupport) {

		if ( input.val() == '' ) input.val(input.attr('placeholder'));
		input.focus( function(){
			if( $.trim(input.val()) == input.attr('placeholder') ){
				input.val('');
				$(this).removeClass('placeholder');
			}
		});
		input.blur( function(){
			if( $.trim(input.val()) == '' ){
				input.val(input.attr('placeholder'));
				$(this).addClass('placeholder');
			}
		});
	}

	if ( button && button.length > 0 ) {
		button.click(function(e) {
			var inval = $.trim(input.val());
			if ( inval == originalvalue ) {
				e.preventDefault();
			}
		});
		button.keyup(function(e) {
			var inval = $.trim(input.val());
			if ( inval == originalvalue ) {
				e.preventDefault();
			}
		});
	}
}

function initRedeemQuote() {

	$enterQuote = $('.footer .enter-quote');
	$goButton = $("#redeemQuoteGoButton");
	$quoteInput = $(".footer #redeemQuoteInput");
	$quoteError = $("#redeemQuoteErrorMessage");

	textReplacement($quoteInput, $goButton);

	$enterQuote.addClass('enter-quote-closed');
	$(".toggle-quote").click(function () {
		if( $enterQuote.hasClass('enter-quote-closed')){
			$enterQuote.show().removeClass('enter-quote-closed');
		}
		else{
			$enterQuote.hide().addClass('enter-quote-closed');
			textReplacement($quoteInput, $goButton);
			if (!$quoteInput.hasClass("placeholder")) {
				$quoteInput.addClass("placeholder");
			}
			$quoteError.text("");
		}
		return false;
	});

	$goButton.click(function () {
		var quote = $quoteInput.val();

		if (quote.match(/^[PDMRT]/i) || quote.match(/^[0-9]+$/))
		{
			showRedeemQuoteError('* "S" quotes only here.  Enter others in cart.');
			return false;
		}
		else if (!quote || quote.length == 0 || !quote.match(/^[A-Za-z0-9]+$/) || !quote.match(/^[Ss]{1}[0-9]+$/))
		{
			showRedeemQuoteError('* Invalid quote number.');
			return false;
		}

		return true;
	});

	function showRedeemQuoteError(errorText) {
		//morganm moved styles to alerts.css in global.csss
		$quoteError.text(errorText).show();
		$quoteInput.addClass('error');
	}
}

function initCountryFlag() {
	if ( window.ltCountryInfo ) {
		var isoCode = _lt.user.getInfo('displayIso','us');
		var flag = ltCountryInfo[isoCode].flag;
		var countryName = ltCountryInfo[isoCode].name;
		if (flag) {
			if (flag.indexOf('http') != 0) {
				if (flag.indexOf('/') == 0) {
					flag = includesDomain + flag;
				}
				else {
					flag = includesDomain + '/' + flag;
				}
			}

			// Country Flag and Country Name occur in header and footer
			$('.country-flag-img').attr('src', flag);
			var altText = countryName ? countryName.toLowerCase() + " flag icon" : "";
			$('.country-flag-img').attr('alt', altText);
			$('.country-name').text(countryName);

		}
	}
}

function initMobileFooterCollapse() {
    $('.footer-group-collapsable .footer-header').bind('click', function() {
        var $footerTitle = $(this);
        var $footerIcon = $footerTitle.find('.footer-icon');
        var $footerContent = $footerTitle.siblings();

        // Toggle the unordered list
        $footerContent.toggleClass('in');
        // Toggle between plus/minus classes
        $footerIcon.toggleClass('icon-plus-sign icon-minus-sign');
    });
}

function initBrandsImage() {
	if ( window.ltCountryInfo ) {

		var isoCode = _lt.user.getInfo('displayIso','us');
		var langCode = _lt.user.displayLang;

		var thisCountryInfo = ltCountryInfo[isoCode];
		var brandsImagePath = thisCountryInfo['brandsImagePath'];

		//Default to US image if none found for current region
		if ( !brandsImagePath && ltCountryInfo['us'] ) brandsImagePath = ltCountryInfo['us']['brandsImagePath'];

		// Do we have an image path? Let's fix any protocol issues and build out the CSS for it
		if ( brandsImagePath ) {

			// Fix protocol if necessary
			if (brandsImagePath.indexOf('http') != 0) {
				if (brandsImagePath.indexOf('/') == 0) {
					brandsImagePath = window.location.protocol + "//" + environmentURL.LTSERVER + brandsImagePath;
				} else {
					brandsImagePath = window.location.protocol + "//" + environmentURL.LTSERVER + '/' + brandsImagePath;
				}
			}
			var brandsImageUrl = 'url("' + brandsImagePath + '")';
		}

		var $brandsBar = $('#hfOurProductsList');
		var $brandsList = $('#hfOurProductsMobileList');

		var $brandsParent = $brandsBar.parent();
		var $brandsListParent = $brandsList.parent();

		var totalBrands = 0;
		for ( var i = 1; i <= 7; i++ ) {

			var $brandElement = $('.product-nav-'+i, $brandsBar);
			var $brandLink = $('a',$brandElement);

			var $listElement = $('.product-nav-'+i, $brandsList);
			var $listLink = $('a',$listElement);

			var thisURL = thisCountryInfo['brand'+i+'linkURL'];
			var thisText = thisCountryInfo['brand'+i+'linkText'];

			var thisOpensInNewWindow = thisCountryInfo['brand'+i+'openLinkInNewWindow'];

			// If a URL is set, assign it - otherwise remove the brand image
			if ( thisURL ) {
				totalBrands++;
				$brandLink.attr('href',thisURL);
				if ( thisOpensInNewWindow && ( thisOpensInNewWindow === true || thisOpensInNewWindow === 'true' ) ) {
					$brandLink.attr('target','_blank');
				}

				if ( thisText ) {
					$listLink.attr('href',thisURL).text(thisText);
					if ( thisOpensInNewWindow && ( thisOpensInNewWindow === true || thisOpensInNewWindow === 'true' ) ) {
						$listLink.attr('target','_blank');
					}
				} else {
					$listLink.parent().remove();
				}


			} else {
				$brandElement.remove();
				$listElement.remove();
			}
		}

		if ( totalBrands > 0 ) {
			// Set as 'active' which should show it, use a class to space these out when needed
			$brandsBar.addClass('our-products-list-'+totalBrands+'-items');
			$brandsParent.addClass('active');
			if(typeof(initB2bPunchoutLinks) == 'function'){
				// Nuke the target_blank anchors in punchout for B2B users
				initB2bPunchoutLinks( $('a[target=_blank]',$brandsBar) );
				initB2bPunchoutLinks( $('a[target=_blank]',$brandsList) );
			}

		} else {
			$brandsParent.remove();
			$brandsListParent.remove();
		}
	}

}

/* This is not a global function */
(function () {

	function initScmsLogo() {

		var displayType = getCookie("CK_DISPLAY_TYPE");

		if (displayType && displayType.toLowerCase() === 'scmscfg') {

			if (globalHeaderConfig && globalHeaderConfig.logoImagePath) {
				var logoLImage = document.getElementById('supplyCenterLogoImage');

				if (logoLImage) {
					logoLImage.src = globalHeaderConfig.logoImagePath;
				}
			}
		}
	}

	initScmsLogo();

})();

initRedeemQuote();
initCountryFlag();
initBrandsImage();
initMobileFooterCollapse();
// DTM footer init
if ( window._satellite && window._satellite.pageBottom ) { window._satellite.pageBottom(); }
