# /bin/sh
while true
do
echo auto-run starting bot
node ./build/src/bot.js
echo auto-run restarting bot in 5 Seconds...
sleep 5
done