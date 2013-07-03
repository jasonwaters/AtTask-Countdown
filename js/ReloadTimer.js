(function($) {
    "use strict";
    $.Waters = $.Waters || {};

    $.Waters.ReloadPage = function(reloadInterval) {
        reloadInterval = reloadInterval || 1800000; // 30 mins

        var timer = setInterval(function() {
            clearInterval(timer);
            timer = null;
            window.location.reload();
        }, reloadInterval);
    };
})(jQuery);