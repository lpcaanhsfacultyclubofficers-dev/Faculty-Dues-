import * as fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = 'className={`${isDarkMode ? \'bg-gray-900 border-gray-800\' : \'bg-white border-blue-100\'} w-full max-w-2xl max-h-[85vh]';
const replacement = 'className={`${isDarkMode ? \'bg-gray-900 border-gray-800\' : \'bg-white border-blue-100\'} w-full max-w-2xl lg:max-w-3xl lg:p-4 max-h-[85vh]';

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', content);
    console.log('Replaced 1st item');
} else {
    console.log('Not found');
}
