window.CalendarView = class CalendarView extends View {
    static APP_ID = "Calendar";
    meta() {
        return {
            title: "Family Calendar",
            description: `Discover your ancestral legacy with the Wikitree Family Calendar, showcasing birth and death anniversaries of ten generations of your ancestors.`,
            docs: "",
        };
    }

    init(selector, person_id) {
        WikiTreeAPI.postToAPI({
            appId: CalendarView.APP_ID,
            action: "getPeople",
            keys: person_id,
            ancestors: 10,
            siblings: 1,
            fields: "Derived.ShortName,BirthDate,DeathDate,Name",
        }).then(function (data) {
            $('#view-container').append($("<div id='cal-container'>"));
            $('#cal-container').fullCalendar().fullCalendar('destroy');
            // Define an error message for permission denial
            const errorMessage = "Ancestor/Descendant permission denied.";

            // Check if the API response contains the permission error
            if (
                data[0].resultByKey &&
                data[0].resultByKey[person_id] &&
                data[0].resultByKey[person_id].status === errorMessage
            ) {
                let err = `The starting profile data could not be retrieved.`;
                if (wtViewRegistry?.session.lm.user.isLoggedIn()) {
                    err += ` You may need to be added to the starting profile's Trusted List.`;
                } else {
                    err += ` Try the Apps login.`;
                }
                wtViewRegistry.showError(err);
                wtViewRegistry.hideInfoPanel();
            } else {
                const wtIdTextValue = $('#wt-id-text').val();
                // Extract the people data from the API response
                const peopleData = data[0].people;
                // Create an array to store all events
                const allEvents = [];

                // Loop through the people data and create events for birth dates
                for (const [id, person] of Object.entries(peopleData)) {
                    // Skip persons with missing birth date
                    if (!person.BirthDate || person.BirthDate === '0000-00-00') {
                        continue;
                    }

                    // Create an event object for birth date
                    var birthyear = new Date(person.BirthDate).getFullYear();
                    const eventBirth = {
                        title: `${person.ShortName} - Birth ${birthyear}`,
                        start: person.BirthDate,
                        url: `https://www.wikitree.com/index.php?title=Special:Relationship&action=calculate&person1Name=${wtIdTextValue}&person2Name=${person.Name}`
                    };

                    // Push the event object to the events array
                    allEvents.push(eventBirth);

                    // Check if DeathDate exists and is not "0000-00-00", then create event for death date
                    if (person.DeathDate && person.DeathDate !== '0000-00-00') {
                        var deathyear = new Date(person.DeathDate).getFullYear();
                        const eventDeath = {
                            title: `${person.ShortName} - Death ${deathyear}`,
                            start: person.DeathDate,
                            url: `https://www.wikitree.com/index.php?title=Special:Relationship&action=calculate&person1Name=${wtIdTextValue}&person2Name=${person.Name}`
                        };
                        allEvents.push(eventDeath);
                    }
                }

                // Now you have all events in the desired format
                // You can use it here or pass it to another function, etc.
                var currentMonth;
                var currentYear;
                // Initialize FullCalendar inside the .then() block
                $('#cal-container').fullCalendar({
                    events: allEvents,
                    eventRender: function (event, element) {
                        element.on('mouseenter', function () {
                            $(this).css('background-color', '#25422d');
                        });
                        element.on('mouseleave', function () {
                            $(this).css('background-color', '');
                        });
                    },
                    showNonCurrentDates: false,
                    fixedWeekCount: false,
                    aspectRatio: 2,
                    eventTextColor: '#FFFFFF',
                    viewRender: function (view, element) {
                        // Get the current start and end dates being displayed in the current view
                        const startDate = view.start;
                        const endDate = view.end;
                        var currentDate = $('#cal-container').fullCalendar('getDate');
                        currentMonth = currentDate.format('MMM');
                        currentYear = currentDate.year();
                        // Create an array to store the events for the current view
                        const eventsToShow = [];

                        // Loop through all events and create events for every year in the current view's date range
                        for (const event of allEvents) {
                            const eventDate = moment(event.start);

                            // Create an event for every year between the start and end dates of the current view
                            for (let year = startDate.year(); year <= endDate.year(); year++) {
                                const newEvent = {
                                    ...event,
                                    start: eventDate.year(year).format('YYYY-MM-DD')
                                };
                                eventsToShow.push(newEvent);
                            }
                        }

                        // Clear the existing events on the calendar
                        $('#cal-container').fullCalendar('removeEvents');

                        // Add the events for the current view to the calendar
                        $('#cal-container').fullCalendar('addEventSource', eventsToShow);

                        // Remove the active class from all buttons
                        $('.fc-customButton').removeClass('active-view-button');
                        // Add the active class to the default button (month view)
                        $('.fc-defaultView-button').addClass('active-view-button');
                    },
                    customButtons: {
                        printCalendar: {
                            text: 'Print Calendar',
                            click: function () {
                                // Get the calendar container element
                                var calendarContainer = document.getElementById('view-container');

                                // Hide the left and right header components
                                var originalHeaderLeft = calendarContainer.getElementsByClassName('fc-left')[0];
                                var originalHeaderRight = calendarContainer.getElementsByClassName('fc-right')[0];
                                originalHeaderLeft.style.display = 'none';
                                originalHeaderRight.style.display = 'none';

                                // Create the image
                                html2canvas(calendarContainer).then(function (canvas) {
                                    // Convert the canvas to a data URL and download it
                                    var link = document.createElement('a');
                                    link.download = `${currentMonth}_${currentYear}.png`;
                                    link.href = canvas.toDataURL();
                                    link.click();

                                    // Restore the original header components' display after printing
                                    originalHeaderLeft.style.display = '';
                                    originalHeaderRight.style.display = '';
                                });
                            }
                        },
                        listDay: {
                            text: 'day',
                            click: function () {
                                $('#cal-container').fullCalendar('changeView', 'listDay');
                                $('.fc-customButton').removeClass('active-view-button');
                                $('.fc-listDay-button').addClass('active-view-button');
                            }
                        },
                        listWeek: {
                            text: 'week',
                            click: function () {
                                $('#cal-container').fullCalendar('changeView', 'listWeek');
                                $('.fc-customButton').removeClass('active-view-button');
                                $('.fc-listWeek-button').addClass('active-view-button');
                            }
                        },
                        defaultView: { // Add this new button
                            text: 'month',
                            click: function () {
                                $('#cal-container').fullCalendar('changeView', 'month');
                                $('.fc-customButton').removeClass('active-view-button');
                                $('.fc-defaultView-button').addClass('active-view-button');
                            }
                        }
                    },
                    header: {
                        left: 'defaultView,listWeek,listDay',
                        center: 'title',
                        right: 'today prev,next printCalendar',
                    }
                });

                $(document).ready(function () {
                    $(".fc-day-number").css("font-size", "large");
                    $("a").css("text-decoration", "none");
                    $("td.fc-today").css("background-color", "#FFC");
                    $("body").css("background", "#FFF");
                });
            }
        });
    }
};
