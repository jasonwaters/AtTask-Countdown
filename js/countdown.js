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

    var countdownApp = angular.module('countdown', []);

    countdownApp.value('targetDate', moment(COUNTDOWN_SETTINGS['targetDate']).toDate());
    countdownApp.value('apiKey', COUNTDOWN_SETTINGS['apiKey']);
    countdownApp.value('username', COUNTDOWN_SETTINGS['username']);
    countdownApp.value('password', COUNTDOWN_SETTINGS['password']);
    countdownApp.value('portfolioID', COUNTDOWN_SETTINGS['portfolioID']);
    countdownApp.value('updateFrequency', COUNTDOWN_SETTINGS['updateFrequency'] * MILLIS_PER_SECOND * SECONDS_PER_MINUTE); //convert minutes to milliseconds

    countdownApp.service('attaskService', function($window, $http, apiKey, username, password) {
        var sessionID;

        function prepareParams(params) {
            params['jsonp'] = 'JSON_CALLBACK';
            if(apiKey && apiKey.length > 0) {
                params['apiKey'] = apiKey;
            }else if(sessionID && sessionID.length > 0) {
                params['sessionID'] = sessionID;
            }
            return params;
        }

        this.authenticate = function() {
            var promise;

            if(apiKey && apiKey.length > 0) {
                promise = {
                    then: function(callback) {
                        callback({'apiKey': apiKey});
                    }
                };
            }else if(sessionID && sessionID.length > 0) {
                promise = {
                    then: function(callback) {
                        callback({'sessionID': sessionID});
                    }
                };
            }else {
                var endpoint ='/login',
                    params = {
                        'username': username,
                        'password': password
                    };
                promise = $http.jsonp(API_URL + endpoint, {
                        'params': prepareParams(params)
                    }).then(function(response) {
                        sessionID = response.data.data.sessionID;
                        return {
                            'sessionID': sessionID
                        }
                    });
            }
            return promise;
        };
        this.getProgram = function(programID) {
            var endpoint ='/program/' + programID,
                params = {};

            params['method'] = 'GET';
            params['fields'] = 'projects:percentComplete';

            var promise = $http.jsonp(API_URL + endpoint, {
                'params' : prepareParams(params)
            }).then(function(result) {
                return result.data.data;
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

    countdownApp.controller('release-controller', function($scope, $timeout, attaskService, portfolioID, updateFrequency) {
        attaskService.authenticate(); //must call this before any other api requests.
        $scope.overallPercentComplete = 0;

        function updateNow() {
            attaskService.getProgram(portfolioID).then(function(program) {
                if(program) {
                    $scope.program = program;
                    var totalPercent = 0;

                    _.forEach(program.projects, function(project) {
                        totalPercent += project.percentComplete;
                    });
                    $scope.overallPercentComplete = totalPercent / program.projects.length;
                }
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