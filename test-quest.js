const fs = require('fs');
const path = require('path');

// Читаем файл с задачами
const tasksFile = path.join(__dirname, 'data', 'tasks.json');
const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));

console.log('✅ Квест успешно загружен!');
console.log(`📅 Программа: ${tasks.programStart}`);
console.log(`📚 Недель: ${tasks.weeks}`);
console.log(`🎯 Задач: ${tasks.tasks.length}`);

// Проверяем наш квест
const quest = tasks.tasks[0];
console.log('\n🎮 Квест MetaEggs: Dmitry:');
console.log(`   📝 Название: ${quest.title}`);
console.log(`   🏷️  Тип: ${quest.type}`);
console.log(`   ⭐ Звезда: ${quest.star ? 'Да' : 'Нет'}`);
console.log(`   💰 XP: ${quest.xp}`);
console.log(`   🔗 Ссылка: ${quest.href}`);
console.log(`   🏢 Бренд: ${quest.brand}`);
console.log(`   🎨 Цвет: ${quest.brand_color}`);
console.log(`   📍 Неделя ${quest.week}, День ${quest.day}`);

// Проверяем API
console.log('\n🌐 Проверяем API...');
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/week/1/tasks',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const apiResponse = JSON.parse(data);
      console.log('✅ API работает корректно!');
      console.log(`📊 Получено задач: ${apiResponse.length}`);
      if (apiResponse[0]) {
        console.log(`🎯 Первая задача: ${apiResponse[0].title}`);
      }
    } catch (e) {
      console.log('❌ Ошибка парсинга API ответа:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.log('❌ Ошибка API:', e.message);
});

req.end();


