import React, {useState, useEffect} from 'react';
<<<<<<< HEAD
import {Container, Row, Col, Form} from 'react-bootstrap'
import WeatherTicker from './WeatherTicker.jsx'
import axios from 'axios'


const WeatherBar = ({userLocation}) => {
const [isSwitchOn, setIsSwitchOn] = useState(false);
const [view, setView] = useState([]);
const [viewLoaded, setViewLoaded] = useState(false);
const {lat, lng} = userLocation;
  
  const toggleSwitch = () => {
    setIsSwitchOn(!isSwitchOn)
  }

  const updateWeather = () => {
    axios.get('https://api.openweathermap.org/data/2.5/onecall', {
      params: {
        lat: lat,
        lon: lng,
        units: 'Imperial',
        appid: '3fa21bd691a27fe5b69030afc26e8f53',
        },
      }).then(({data}) => {
        console.log(data)
        isSwitchOn ? setView(data.daily.slice(1, 6)) : setView(data.hourly.slice(0, 7))
        setViewLoaded(true);
      }).catch((err) => console.error('There seems to be an error', err))
    }
  useEffect(() => {
    updateWeather()
  }, [isSwitchOn])

  return <div>
    <Container>
    <Row style={{boarder: '1px solid black'}}>
      <Col xs='1'> 
      <div>Wanderlust</div>
      </Col>
      <Col xs='1'>
        <Form>
          <Form.Switch
            onChange={toggleSwitch}
            type="switch"
            id="custom-switch"
            checked={isSwitchOn}
            label="Gallivanter"
          />
        </Form>
      </Col>
      </Row>
      <Row>
      <Col xs='12'>
      <div style={{display: 'flex'}}>
      
        {viewLoaded && view.map((weather) => 
        (weather.temp instanceof Object) ? 
            <WeatherTicker 
              time={weather.dt}
              day={weather.temp.day}
              eve={weather.temp.eve}
              description={weather.weather[0].main}
              icon={weather.weather[0].icon}
          />
          :
          <WeatherTicker 
              time={weather.dt}
              temp={weather.temp}
              description={weather.weather[0].main}
              icon={weather.weather[0].icon}
          />
        )}
        </div>
        </Col>
      </Row>
  </Container>
=======
import {CardDeck, Card} from 'react-bootstrap'


const WeatherBar = (user) => {
  const [userLocation, setUserLocation] = useState({
    lat: 30.0766974,
    lng: -89.8788793,
  })
  
  return <div>
    <h1>Weather Widget Here</h1>
    <CardDeck>
  <Card>
    <Card.Body>
      <Card.Title>Card title</Card.Title>
      <Card.Img variant="top" src="holder.js/100px160" />
      <Card.Text>
        This is a wider card with supporting text below as a natural lead-in to
        additional content. This content is a little bit longer.
      </Card.Text>
    </Card.Body>
  </Card>
</CardDeBck>
>>>>>>> b0fe317... [Feature] Build Weather Component container and add to Home.
  </div>;
};
export default WeatherBar;
