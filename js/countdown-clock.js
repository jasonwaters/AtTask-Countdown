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

    countdownApp.value('targetDate', moment(COUNTDOWN_SETTINGS['COUNTDOWN_TARGET_DATE']).toDate());
    countdownApp.value('apikey', COUNTDOWN_SETTINGS['API_KEY']);
    countdownApp.value('username', COUNTDOWN_SETTINGS['USERNAME']);
    countdownApp.value('password', COUNTDOWN_SETTINGS['PASSWORD']);
    countdownApp.value('portfolioID', COUNTDOWN_SETTINGS['PORTFOLIO_ID']);

    countdownApp.service('attaskService', function($window, $http, apikey, username, password) {
        var sessionID;

        function prepareParams(params) {
            params['jsonp'] = 'JSON_CALLBACK';
            if(apikey && apikey.length > 0) {
                params['apiKey'] = apikey;
            }else if(sessionID && sessionID.length > 0) {
                params['sessionID'] = sessionID;
            }
            return params;
        }

        this.authenticate = function() {
            var promise;

            if(apikey && apikey.length > 0) {
                promise = {
                    then: function(callback) {
                        callback({'apikey': apikey});
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

    countdownApp.controller('release-controller', function($scope, attaskService, portfolioID) {
        attaskService.authenticate(); //must call this before any other api requests.
        $scope.overallPercentComplete = 0;
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
    });
})();