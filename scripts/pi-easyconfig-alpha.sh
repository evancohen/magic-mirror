#!/bin/bash
alias _todo_="if [ ]; then"
alias _todone_="fi"
alias InvalidInput-"clear && echo $'\n\n' && echo '**** Invalid Input ****'"
_todo_
echo "make function to check for an asoundrc file and prompt to rerun audio config"
echo "make function to check for the boot script and prompt to run if it doesn't exist"
echo "finish the steps to configure smart mirror checking the step first and prompting to run 
		if not done or re-run if its a task that can be rerun"
_todone_





function init(){
asoundrcFile=~/.asoundrc
arecout=`arecord -l | grep "card"`
aplaout=`aplay -l | grep "card"`
tempasound='pcm.!default {
  type asym
   playback.pcm {
     type plug
     # Playback_Desc
     slave.pcm "hw:Playback_DevID"
   }
   capture.pcm {
     type plug
     # Capture_Desc
     slave.pcm "hw:Capture_DevID"
   }
}'

}


function getCard {
	gc_result="-1"
	readarray -t arr_alsaOut <<<"$1"
	echo $'\n\n'
	recInd=0
	counter=1
	lowpoint=0
	echo "List of $2 Devices"
	echo ""
	for index in "${!arr_alsaOut[@]}"
	do
		if echo "${arr_alsaOut[index]}" | grep -q "card"
		then
			recDev[recInd]="${arr_alsaOut[index]}"
			echo "$[recInd]) ${recDev[recInd]}"
			let recInd=$recInd+$counter
		fi
	
	done
	echo "$recInd) Quit Script"
	echo ""
	prompt="Enter the number of the $2 device you would like to use:  "
	nums=${#recInd}
	read -n "$nums" -p "$prompt" choice
	echo ""
	if [ $choice -le $recInd ];
	then
		if [ $choice -ge $lowpoint ];
		then
			if [ $choice -eq $recInd ];
			then
				echo "exiting....."
				exit 0
			else
				gc_result=`echo "${recDev[choice]}" | grep -oE "[0-9]:"`
				gc_result=`echo "$gc_result" | tr -d '\n'`
				gc_result=`echo "$gc_result" | tr : ,`
				gc_result=${gc_result::-1}
				tempasound="${tempasound/$2_DevID/$gc_result}"
				temp1="${recDev[choice]}"
				tempasound="${tempasound/$2_Desc/$temp1}"
				gc_result="0"
			fi
		else
			InvalidInput
		fi
	else
		InvalidInput
	fi
}
_todo_
function checkRunOnBoot(){
	if echo 'cat /home/pi/.config/lxsession/LXDE-pi/autostart' | grep "/home/pi/smart-start.sh &"
}
_todone_
function SetRunOnBoot(){
	prompt="Would you like to run the Smart Mirror on boot? [Y/n] "
	clear 
	read -n 1 -p "$prompt" choice
		echo ""
	if [ "$choice" = "y" ] || [ "$choice" = "Y" ]
	then
		echo "Copying the Start script."
		cd ~ && cp ./smart-mirror/scripts/bash-start.sh smart-start.sh
		echo "configuring Start Script permissions"
		chown pi:pi /home/pi/smart-start.sh && chmod +x /home/pi/smart-start.sh
		echo "checking to see if start up script is configured" 
		echo "/home/pi/smart-start.sh &" >> /home/pi/.config/lxsession/LXDE-pi/autostart
	elif [ "$choice" = "n" ] || [ "$choice" = "N" ]
		echo "Start script not copied"
	else
		InvalidInput
		SetRunOnBoot
		return -1
	fi
}
function checkAudioFile(){
if [ -f "$1" ]
then
	prompt='File: "$1" already exists. Would you like to re-run the audio configuration? [y/N] '
	read -n 1 -p "$prompt" choice
	if [ "$choice" = "y" ] || [ "$choice" = "Y" ]
	then
		echo 'Renaming file: "$1" to start a fresh Audio file'
		mv $1 ${1/./old}_$(date +%d%m%Y-%T).txt
		return 0
	elif [ "$choice" = "n" ] || [ "$choice" = "N" ]
		echo "Audio Configuration Not Run"
		return 1
	else
		InvalidInput
		return -1
	fi
else
fi
}
function configAudio(){
gc_result="-1"
while (( gc_result != 0 )); do
	getCard "$arecout" "Capture"
done

gc_result="-1"
while (( gc_result != 0 )); do
	getCard "$aplaout" "Playback"
done
clear
if [ ! -e "$asoundrcFile" ]
then
	echo "$tempasound" > "$asoundrcFile"
fi
if [ -e "$asoundrcFile" ]
then
	echo $'\n\n'
	echo "~/.asoundrc File Succeeded!"
	echo "File Contents:"
	echo $'\n\n'
	echo "$tempasound"
	echo $'\n\n'
else
	echo $'\n\n'
	echo "~/.asoundrc File Creation Failed!"
fi
}
function mainAudio(){
until checkAudioFile "$asoundrcFile";
do
	case $? in
		0)
			configAudio
		;;
		1)
			return 0
		;;
	esac
done
	
}


clear
init

mainAudio