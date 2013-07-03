(function () {
    var MILLIS_PER_SECOND = 1000;
    var MINUTES_PER_HOUR = 60;
    var HOURS_PER_DAY = 24;

    var SECONDS_PER_MINUTE = 60;
    var SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
    var SECONDS_PER_DAY = SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;

    var countdownApp = angular.module('countdown', []);

    countdownApp.value('targetDate', moment(COUNTDOWN_TARGET_DATE).toDate());

    countdownApp.filter('pad', function() {
        return function (value, size) {
            if(value < 0) {
                return "  ";
            }
            var s = value+"";
            while (s.length < size) s = "0" + s;
            return s;
        };
    });

    countdownApp.controller('CountdownController', function($scope, targetDate) {
        var timer = setInterval(function() {
            var days = 0, hours = 0, mins = 0, secs = 0;

            var now = new Date();
            var diff = (targetDate.getTime() - now.getTime() + 5)/MILLIS_PER_SECOND; //in seconds

            if (diff < 0) {
                clearInterval(timer);
                timer = null;
            } else {
                days = Math.floor(diff / SECONDS_PER_DAY);
                diff = diff % SECONDS_PER_DAY; //remaining seconds in excess of full days

                hours = Math.floor(diff / SECONDS_PER_HOUR);
                diff = diff % SECONDS_PER_HOUR; //remaining seconds in excess of full hours

                mins = Math.floor(diff / SECONDS_PER_MINUTE);
                diff = diff % SECONDS_PER_MINUTE; //remaining seconds in excess of full minutes

                secs = Math.floor(diff);
            }

            $scope.$apply(function() {
               $scope.data = {
                   'days': days,
                   'hours': hours,
                   'minutes': mins,
                   'seconds': secs
               };
            });
        }, 1000);

        $scope.data = {
            'days': -1,
            'hours': -1,
            'minutes': -1,
            'seconds': -1
        };
    });
})();