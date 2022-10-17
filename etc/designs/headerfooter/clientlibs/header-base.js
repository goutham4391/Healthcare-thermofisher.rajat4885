	//  Sticky header
	$(document).scroll(function () {
        var scroll = $(this).scrollTop();

        //do not activate scroll for viewports lower than  979
        if ((scroll) && ($(window).width() > 979)) {
            // hide utility bar elements
            $("#header-nav-container,#hfCloud, #hfCustomerServiceLi, #hfGreetByName, #hfGreetAnonymous, #hfBarQuickOrder").addClass("hidden");
            
            // turn on sticky
            $(".globalHeader").addClass("sticky-header");
            $("#primarySearch").addClass("sticky-search");

        } else {
        	// show utility bar elements
            $("#header-nav-container, #hfCloud, #hfCustomerServiceLi, #hfGreetByName, #hfGreetAnonymous, #hfBarQuickOrder").removeClass("hidden"); 
            
            // turn off sticky
            $('.globalHeader').removeClass("sticky-header"); 
            $("#primarySearch").removeClass("sticky-search");
        }
    });

 
 
var gcbPositioning = function () {
	var headerSeparatorPosition = 0;
	var gcbPosition = $(".global-commerce-bar-spacing").position();
	// whenheader wraps in two lines
	if (gcbPosition && gcbPosition.top == 145) {
		$(".globalHeader").addClass('header-padding')
		headerSeparatorPosition = '108px';
		// when spacing bar disappears
	} else if (gcbPosition && gcbPosition.top == 0) {
		headerSeparatorPosition = '0px';
		// all other cases
	} else {
		headerSeparatorPosition = '69px';
	}
	// check if the element exists
	if(document.getElementById("headerSeparator")){
		document.getElementById("headerSeparator").style.height = headerSeparatorPosition;
	}
}

//push the content down when the header is wrapped in more than one
$(document).ready(function () {
	gcbPositioning();
	$(window).bind(" resize", gcbPositioning);
	
	// To Update B2B : SupplyCenter logo on landing page as non clickable/selectable
	 
	    if( (getCookie('CK_DISPLAY_TYPE') == "cmgtpscms" ) && ( getQueryParam("cmd") =="B2BHomePage")) {
           document.getElementById("hfLifetechLogoLink").removeAttribute('href');
         }
});
