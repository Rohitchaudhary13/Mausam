const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const schedule = require('node-schedule');
require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const citySubscriptions = new Map(); // Store user chat IDs and their preferred cities

// Schedule a job to send weather updates every minute
schedule.scheduleJob('* * * * *', async () => {
  await sendWeatherUpdatesToSubscribers();
});

// Listen for messages and respond to user commands
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userInput = msg.text.toLowerCase();

  if (userInput === '/weather') {
    // User requested weather update
    await sendWeatherUpdate(chatId);
  } else if (userInput === '/subscribe') {
    // User wants to subscribe for daily updates
    await subscribeUser(chatId);
  } else if (userInput === '/unsubscribe') {
    // User wants to unsubscribe from daily updates
    await unsubscribeUser(chatId);
  } else if (userInput.startsWith('/setcity ')) {
    // User wants to set their preferred city
    const city = userInput.replace('/setcity ', '').trim();
    await setPreferredCity(chatId, city);
  } else {
    // User sent a message; handle accordingly
    handleUserMessage(chatId, userInput);
  }
});

async function sendWeatherUpdate(chatId) {
  const preferredCity = citySubscriptions.get(chatId);
  if (!preferredCity) {
    bot.sendMessage(chatId, "Please set your preferred city using '/setcity <city>' before requesting weather updates.");
    return;
  }

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${preferredCity}&appid=${OPENWEATHERMAP_API_KEY}`
    );
    const data = response.data;
    const weather = data.weather[0].description;
    const temperature = data.main.temp - 273.15;
    const city = data.name;
    const humidity = data.main.humidity;
    const pressure = data.main.pressure;
    const windSpeed = data.wind.speed;
    const message = `The weather in ${city} is ${weather} with a temperature of ${temperature.toFixed(
      2
    )}°C. The humidity is ${humidity}%, the pressure is ${pressure}hPa, and the wind speed is ${windSpeed}m/s.`;

    bot.sendMessage(chatId, message);
  } catch (error) {
    bot.sendMessage(chatId, `City '${preferredCity}' doesn't exist.`);
  }
}

async function subscribeUser(chatId) {
  const currentCity = citySubscriptions.get(chatId);
  if (currentCity !== undefined && currentCity !== null) {
    // Subscribe the user (store their chat ID in subscriptions)
    citySubscriptions.set(chatId, currentCity);
    bot.sendMessage(chatId, 'You are now subscribed to daily weather updates.');
  } else {
    bot.sendMessage(chatId, "Please set your preferred city using '/setcity <city>' before subscribing to weather updates.");
  }
}


async function unsubscribeUser(chatId) {
  if (citySubscriptions.has(chatId)) {
    // Unsubscribe the user (remove their chat ID from subscriptions)
    citySubscriptions.delete(chatId);
    bot.sendMessage(chatId, 'You have unsubscribed from daily weather updates.');
  } else {
    bot.sendMessage(chatId, 'You are not subscribed to weather updates.');
  }
}

async function setPreferredCity(chatId, city) {
  // Set the user's preferred city
  citySubscriptions.set(chatId, city);
  bot.sendMessage(chatId, `Your preferred city is set to '${city}'. You can now subscribe to weather updates using '/subscribe'.`);
}

async function handleUserMessage(chatId, message) {
  // Handle other user messages here
  // Example: You can respond to specific user messages or commands
  if (message === '/hello') {
    bot.sendMessage(chatId, 'Hello, how can I assist you?');
  } else {
    bot.sendMessage(chatId, 'I did not understand your message. You can use commands like /weather, /subscribe, /unsubscribe, /setcity to interact with me.');
  }
}

async function sendWeatherUpdatesToSubscribers() {
  for (const chatId of citySubscriptions.keys()) {
    await sendWeatherUpdate(chatId);
  }
}

// Handle Ctrl+C to gracefully exit the bot
process.on('SIGINT', () => {
  console.log('Bot is shutting down...');
  process.exit();
});
