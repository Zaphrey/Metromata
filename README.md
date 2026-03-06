# Metromata

This is a project I made to learn about Geographical Information Systems along with enhancing my skills in other technologies such as Angular. It's a real time bus tracking application which focuses on transit in the city of Atlanta, Georgia. It uses Leaflet to render the map with map tiles provided by OpenStreetMap, along with Angular to handle state changes and frontend interactions. The name was inspired by Conway's game of life, which uses cellular automata. I thought of all the moving vehicles moving in a similar way, and played with the word to achieve Metromata.

## Instructions for Build and Use

[Metromata Video Demonstration](https://youtu.be/MQibOBoALNg)

Steps to build and/or run the software:

1. Ensure the Node Package Manager (npm) is installed on the device. It can be installed from the [Node.js](https://nodejs.org/en) website.
2. Download the latest release from [GitHub](https://github.com/Zaphrey/Metromata/releases/tag/Metromata)
3. Open any command line interface (cli) and navigate to the project (e.g., `cd Metromata`)
4. Run `npm install -g @angular/cli` to install the Angular cli
5. Run `npm install` to install all required packages
6. Run `ng serve --open` to run the application locally
 
Instructions for using the software:

1. Click and drag over the map to navigate around
2. Click on any white bus markers to see information on active transit vehicles and what routes they're currently on
3. Click on any orange bus markers to see information about a stop and the next expected arrival times
4. On the left navigation bar, click the legend dropdown to show a list for either vehicles or stops
5. If stops are selected, a list of streets will show up. Clicking on any of the streets will open a list with stops. Stops on the street are labeled by their nearest cross street.
6. Click on any stop to fly over to it on the map
7. If vehicles are selected, clicking on any of the vehicles on the list will cause the map to fly over to it.

## Development Environment

To recreate the development environment, you need the following software and/or libraries with the specified versions:

* Angular v21.0.0
* Angular CLI v21.1.5
* Bootstrap v5.3.8
* Leaflet v1.9.4
* Node.js v22.15.0
* Papa Parse v5.5.3
* TypeScript v5.9.2
* Visual Studio Code v1.109.5

## Useful Websites to Learn More

I found these websites useful in developing this software:

* [General Transit Feed Specification Documentation](https://gtfs.org/documentation/overview/)
* [Leaflet Tutorials](https://leafletjs.com/examples.html)
* [MARTA Developer Resources](https://itsmarta.com/app-developer-resources.aspx)

## Future Work

The following items I plan to fix, improve, and/or add to this project in the future:

* [ ] Fix mobile view support as the map is no longer visible on smaller screens
* [ ] Add vehicle and stop filtering
* [ ] Add more types of transit such as train and streetcar transportation