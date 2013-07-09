(function () {
    var MILLIS_PER_SECOND = 1000;
    var MINUTES_PER_HOUR = 60;
    var HOURS_PER_DAY = 24;

    var SECONDS_PER_MINUTE = 60;
    var SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
    var SECONDS_PER_DAY = SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;

    var COUNTDOWN_SETTINGS = window.COUNTDOWN_SETTINGS || {};

    var API_URL = COUNTDOWN_SETTINGS['ATTASK_BASE_URL'] + "/attask/api-internal";

    function getTimeLeft(targetDate) {
        var days = 0, hours = 0, minutes = 0, secs = 0;

        var now = new Date();
        var diff = (targetDate.getTime() - now.getTime() + 5)/MILLIS_PER_SECOND; //in seconds

        if (diff >= 0) {
            days = Math.floor(diff / SECONDS_PER_DAY);
            diff = diff % SECONDS_PER_DAY; //remaining seconds in excess of full days

            hours = Math.floor(diff / SECONDS_PER_HOUR);
            diff = diff % SECONDS_PER_HOUR; //remaining seconds in excess of full hours

            minutes = Math.floor(diff / SECONDS_PER_MINUTE);
            diff = diff % SECONDS_PER_MINUTE; //remaining seconds in excess of full minutes

            secs = Math.floor(diff);
        }

        return {
            'diff': diff,
            'days': days,
            'hours': hours,
            'minutes': minutes,
            'seconds': secs
        };
    }

    function authenticate($http, callback) {
        var endpoint, params = {
            'jsonp': 'JSON_CALLBACK'
        }

        if(COUNTDOWN_SETTINGS['API_KEY'] && COUNTDOWN_SETTINGS['API_KEY'].length > 0) {
            params['apiKey'] = COUNTDOWN_SETTINGS['API_KEY'];
            endpoint = '/session';
        }else {
            params['username'] = COUNTDOWN_SETTINGS['USERNAME'];
            params['password'] = COUNTDOWN_SETTINGS['PASSWORD'];
            endpoint = '/login';
        }

        $http.jsonp(API_URL + endpoint, {
            'params': params
        }).success(function(data, code) {
            callback(data.data.sessionID);
        });
    }

    var countdownApp = angular.module('countdown', []);

    countdownApp.value('targetDate', moment(COUNTDOWN_SETTINGS['COUNTDOWN_TARGET_DATE']).toDate());

    countdownApp.filter('pad', function() {
        return function (value, size) {
            var s = value+"";
            while (s.length < size) s = "0" + s;
            return s;
        };
    });

    countdownApp.controller('countdown-controller', function($scope, targetDate) {
        var timer = setInterval(function() {
            var timeLeft = getTimeLeft(targetDate);

            if (timeLeft.diff < 0) {
                clearInterval(timer);
                timer = null;
            }

            $scope.$apply(function() {
               $scope.data = timeLeft;
            });
        }, 1000);

        $scope.data = getTimeLeft(targetDate);
    });

    countdownApp.controller('release-controller', function($scope, $http) {
        authenticate($http, function(sessionID) {
            $scope.sessionID = sessionID;
        });

        var data = {};

        data.epics = [
            {'name': 'One', 'percentComplete':10},
            {'name': 'Two', 'percentComplete':35},
            {'name': 'Three', 'percentComplete':68},
            {'name': 'Four', 'percentComplete':100},
            {'name': 'Five', 'percentComplete':81}
        ]


        var totalPercent = 0;
        _.forEach(data.epics, function(value) {
            totalPercent += value.percentComplete;
        });

        data.overallPercentComplete = totalPercent / data.epics.length;
        $scope.data = data;
    });
})();