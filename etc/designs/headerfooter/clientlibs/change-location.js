
var changeUrlForSelectedCountryLanguage = function (newCountry, newLang) {
	var previousCountry = _lt.user.displayIso;
	var previousLanguage = _lt.user.displayLang;
	var currentDomain = (MASTER_DOMAIN !== undefined ) ? MASTER_DOMAIN : document.location.hostname ;
	
	if (currentDomain.indexOf(".cn") !== -1 && newCountry !== "cn" ) {
		//redirect to the servlet using the absolute url: value of js variable - environmentURL.WCM_DOMAIN_COM + path to the servlet
		var domain_com = (environmentURL.WCM_DOMAIN_COM !== undefined ) ? environmentURL.WCM_DOMAIN_COM:"";
		var redirectUrl = (domain_com.length != 0 ) ? domain_com + "/apps/setlocation" + "?countryCode=" + newCountry + "&langCode=" + newLang :"/apps/setlocation" + "?countryCode=" + newCountry + "&langCode=" + newLang;
        window.location.assign(redirectUrl);
	}
	//all other cases
	else {
		setCookie('CK_LANG_CODE', newLang, 90); //sets language cookie
		setCookie('CK_ISO_CODE', newCountry, 90); //sets country cookie
		var currentUrl = window.location.href;
		//replace the country and lang using regex
		var newUrl = currentUrl.replace(/\/[a-z]{2}\/[a-z]{2}\//, '/' + newCountry + '/' + newLang + '/');
		// Added condition by TFCE-11493 
		if (currentUrl == newUrl)
			window.location.reload(true);
        else
			window.location.assign(newUrl);
	}
	
}

//this function is called after initRedeemQuote
var initLanguageSelect = function(cq4Domain) {
	var currentLangCode = _lt.user.displayLang;
	var changeLanguageSelect = $("#changeLanguageSelect");

	if (changeLanguageSelect) {
		var optionValues = $("#changeLanguageSelect option");
		if (optionValues) {
			var optionsArray = $.makeArray(optionValues);
			$.each (optionsArray, function(index, option) {
				if (option.value == currentLangCode) {
					changeLanguageSelect.val(currentLangCode);
				}
			});
		}
	}

	$("#changeLanguageButton").bind('click',function () {
		var selectedLanguage = $("#changeLanguageSelect").val().split("-"); //iso-lang
		changeUrlForSelectedCountryLanguage(selectedLanguage[1],selectedLanguage[0]);
		return false;
	});

	// Determine if language menu should display if data attribute is set to isoCode
	if ($('#form-select-language').attr('data-country-code') === _lt.user.displayIso) {
		$('#form-select-language').show();
	}
}

$(function($){
	$changeCountryModal = $('#countrySelectDialog');

	$('.display-country-select').click(function(e) {
		if ( _lt.user.isLoggedIn ) {
			window.location.href = '${countrySelection.supportPage}';
		} else {
			$changeCountryModal.modal('show');
		}
		return false;
	});

	$('.link-change-location',$changeCountryModal).click(function(){
		var $el = $(this);
		var iso = $el.attr('data-iso');
		var lang = $el.attr('data-lang');
		changeUrlForSelectedCountryLanguage(iso, lang);
		return false;
	})

	$('#countrySelectGoButton').click(function() {
		var selectedCountryValue = $("#countrySelect").val();
		if ( !selectedCountryValue || selectedCountryValue === '_other' ) return false;
		var iso = selectedCountryValue.split(':')[0];
		var lang = selectedCountryValue.split(':')[1];
		changeUrlForSelectedCountryLanguage(iso, lang);
		return false;
	});

});

initLanguageSelect();
