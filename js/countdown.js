(function () {
    "use strict";

    var MILLIS_PER_SECOND = 1000;
    var MINUTES_PER_HOUR = 60;
    var HOURS_PER_DAY = 24;

    var SECONDS_PER_MINUTE = 60;
    var SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
    var SECONDS_PER_DAY = SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;

    var COUNTDOWN_SETTINGS = window.COUNTDOWN_SETTINGS || {};

    var BASE_URL = COUNTDOWN_SETTINGS['ATTASK_BASE_URL'];
    var API_URL = BASE_URL + "/attask/api-internal";

    var countdownApp = angular.module('countdown', ['localStorage'], null);

    countdownApp.factory('Settings', function() {
        return  {
            'startDate': moment(COUNTDOWN_SETTINGS['startDate']).toDate(),
            'targetDate': moment(COUNTDOWN_SETTINGS['targetDate']).toDate(),
            'apiKey': COUNTDOWN_SETTINGS['apiKey'],
            'programID': COUNTDOWN_SETTINGS['programID'],
            'updateFrequency': COUNTDOWN_SETTINGS['updateFrequency'] * MILLIS_PER_SECOND * SECONDS_PER_MINUTE
        }
    });

    countdownApp.factory('SharedData', function() {
        return  {
            program:null
        }
    });

    countdownApp.service('attaskService', function($window, $http, Settings) {
        this.prepareParams = function(params) {
            params['jsonp'] = 'JSON_CALLBACK';
            params['apiKey'] = Settings.apiKey;
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

    countdownApp.filter('linkToProject', function() {
        return function(projectID) {
            return BASE_URL + "/project/view?ID=" + projectID;
        }
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
            if(value == null) {
                return 0
            }
            return Math.floor(value);
       };
    });

    countdownApp.filter('ceil', function() {
       return function(value) {
            if(value == null) {
                return 0
            }
            return Math.ceil(value);
       };
    });

    countdownApp.controller('countdown-controller', function($scope, $timeout, Settings, SharedData) {
        var timeoutId;

        function getTimeLeft(targetDate) {
            var days = 0, hours = 0, minutes = 0, secs = 0;

            var diff = (targetDate.getTime() - new Date().getTime() + 5)/MILLIS_PER_SECOND; //in seconds

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

        function trackTime() {
            timeoutId = $timeout(function() {
                var timeLeft = getTimeLeft(Settings.targetDate);
                $scope.clock = timeLeft;

                if (timeLeft.diff > 0) {
                    trackTime();
                }
            }, 1000);
        }
        $scope.$watch(function() { return SharedData.program; }, function(program) {
            $scope.program = program;
        });
        $scope.clock = getTimeLeft(Settings.targetDate);
        trackTime();
    });

    countdownApp.controller('release-controller', function($scope, $timeout, $store, orderByFilter, attaskService, Settings, SharedData) {
        $store.bind($scope, 'overallPercentComplete', 0);
        $store.bind($scope, 'program', null);
        $store.bind($scope, 'projectPairs', null);
        $store.bind($scope, 'numRows', 0);
        $store.bind($scope, 'percentContainerHeight', 0);
        $store.bind($scope, 'expectedPercentComplete', 0);
        $store.bind($scope, 'onTarget', 0);
        $store.bind($scope, 'markerPosition', 0);

        function pairUp(projects) {
            projects = orderByFilter(projects, '-percentComplete');
            var pairedList = [];
            var group = [];

            for(var i =0;i<projects.length;i++) {
                if(group.length < 2) {
                    group.push(projects[i]);
                }

                if(group.length == 2 || i == projects.length-1) {
                    pairedList.push(group);
                    group = [];
                }
            }
            $scope.projectPairs = pairedList;
        };

        function updateNow() {
            attaskService.getProgram(Settings.programID).success(function(result) {
                $scope.isStale = result != null && result.error != null;
                if(result && result.data && !result.error) {
                    SharedData.program = result.data;
                    var projects = SharedData.program['projects'];
                    $scope.isStale = false;
                    $scope.program = SharedData.program;
                    var totalPercent = 0;

                    for(var i=0;i<projects.length;i++) {
                        totalPercent += projects[i]['percentComplete'];
                    }

                    pairUp(projects);
                    $scope.overallPercentComplete = totalPercent / projects.length;

                    $scope.numRows = Math.ceil(projects.length / 2);

                    var VERT_PADDING = 25, ROW_HEIGHT=60, METER_WIDTH=320;
                    $scope.percentContainerHeight = Math.ceil(ROW_HEIGHT * $scope.numRows) + (VERT_PADDING*2)

                    var totalDurationTime = Settings.targetDate - Settings.startDate;
                    var currentDurationTime = new Date()-Settings.startDate;
                    $scope.expectedPercentComplete = Math.max(0,Math.min(100,(currentDurationTime / totalDurationTime)*100));
                    $scope.onTarget = $scope.overallPercentComplete >= $scope.expectedPercentComplete;
                    $scope.markerPosition = METER_WIDTH * ($scope.expectedPercentComplete/100);
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
            }, Settings.updateFrequency);
        }

        updateNow();
    });
})();