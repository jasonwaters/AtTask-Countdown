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

    var countdownApp = angular.module('countdown', ['localStorage']);

    countdownApp.value('targetDate', moment(COUNTDOWN_SETTINGS['targetDate']).toDate());
    countdownApp.value('apiKey', COUNTDOWN_SETTINGS['apiKey']);
    countdownApp.value('portfolioID', COUNTDOWN_SETTINGS['portfolioID']);
    countdownApp.value('updateFrequency', COUNTDOWN_SETTINGS['updateFrequency'] * MILLIS_PER_SECOND * SECONDS_PER_MINUTE); //convert minutes to milliseconds

    countdownApp.service('attaskService', function($window, $http, apiKey) {

        this.prepareParams = function(params) {
            params['jsonp'] = 'JSON_CALLBACK';
            params['apiKey'] = apiKey;
            return params;
        }

        this.getProgram = function(programID) {
            var endpoint ='/program/' + programID,
                params = {};

            params['method'] = 'GET';
            params['fields'] = 'projects:percentComplete';

            var promise = $http.jsonp(API_URL + endpoint, {
                'params' : this.prepareParams(params)
            });
            return promise;
        };
    });


    countdownApp.filter('pad', function() {
        return function (value, size) {
            var s = value+"";
            while (s.length < size) s = "0" + s;
            return s;
        };
    });

    countdownApp.filter('floor', function() {
       return function(value) {
            return Math.floor(value);
       };
    });

    countdownApp.controller('countdown-controller', function($scope, $timeout, targetDate) {
        var timeoutId;

        function trackTime() {
            timeoutId = $timeout(function() {
                var timeLeft = getTimeLeft(targetDate);
                $scope.data = timeLeft;

                if (timeLeft.diff > 0) {
                    trackTime();
                }
            }, 1000);
        }

        $scope.data = getTimeLeft(targetDate);
        trackTime();
    });

    countdownApp.controller('release-controller', function($scope, $timeout, $store, attaskService, portfolioID, updateFrequency) {
        $store.bind($scope, 'overallPercentComplete', 0);
        $store.bind($scope, 'program', null);

        function updateNow() {
            attaskService.getProgram(portfolioID).success(function(result) {
                $scope.isStale = result != null && result.error != null;
                if(result && result.data && !result.error) {
                    var program = result.data;
                    $scope.isStale = false;
                    $scope.program = program;
                    var totalPercent = 0;

                    _.forEach(program.projects, function(project) {
                        totalPercent += project.percentComplete;
                    });
                    $scope.overallPercentComplete = totalPercent / program.projects.length;
                }
            }).error(function() {
               $scope.isStale = true;
            });
            updateLater();
        }

        var timeoutId;

        function updateLater() {
            timeoutId = $timeout(function() {
               updateNow();
            }, updateFrequency);
        }

        updateNow();
    });
})();