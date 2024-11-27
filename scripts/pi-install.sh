#!/bin/bash

#set -e

# Supported versions of node: v4.x, v5.x, v6.x, v7.x, 8.x, 10.x, 14.x
NODE_MINIMUM_VERSION="v18.0.0"
NODE_STABLE_VERSION="20.x"
NPM_TESTED="V10.0.0"
NODE_TESTED="V18.0.0"
PM2_FILE=pm2_smart_mirror.json

# Compare node versions.
function check_version() { test "$(echo "$@" | tr " " "\n" | sort -V | head -n 1)" != "$1"; }
# Check to see if a command exists (if something is installed)
function command_exists () { type "$1" &> /dev/null ;}
function verlte() {  [ "$1" = "`echo -e "$1\n$2" | sort -V | head -n1`" ];}
function verlt() { [ "$1" = "$2" ] && return 1 || verlte $1 $2 ;}


# Terminal Colors
red=$'\e[1;31m'
grn=$'\e[1;32m'
yel=$'\e[1;33m'
blu=$'\e[1;34m'
mag=$'\e[1;35m'
cyn=$'\e[1;36m'
end=$'\e[0m'

# Ensure we are using sudo
if [ "$(whoami)" == "root" ];
then
	echo "Do not run this script with root permissions, try: ./${0##*/} "
	exit 0
fi
ARCH=$(uname -m)
mac=$(uname -s)
if [ $mac == 'Darwin' ]; then
  echo this is a mac | tee -a $logfile
	cmd=greadlink
else
	cmd=readlink
fi
# put the log where the script is located
logdir=$(dirname $($cmd -f "$0"))
# if the script was execute from the web
if [[ $logdir != *"smart-mirror/scripts"* ]]; then
	# use the smart-mirror/scripts folder, if setup
	if [ -d smart-mirror ]; then
		cd ~/smart-mirror/scripts >/dev/null
			logdir=$(pwd)
		cd - >/dev/null
	else
	  # use the users home folder if initial install
	  logdir=$HOME
	fi
fi
logfile=$logdir/install.log
echo install log being saved to $logfile

# Determine which Pi is running.
date +"install starting  - %a %b %e %H:%M:%S %Z %Y" >>$logfile

echo installing on $ARCH processor system >>$logfile

if [ $mac != 'Darwin' ]; then
	echo the os is $(lsb_release -a 2>/dev/null) >> $logfile
fi
cat << "EOF"
 ________  _____ ______   ________  ________  _________
|\   ____\|\   _ \  _   \|\   __  \|\   __  \|\___   ___\
\ \  \___|\ \  \\\__\ \  \ \  \|\  \ \  \|\  \|___ \  \_|
 \ \_____  \ \  \\|__| \  \ \   __  \ \   _  _\   \ \  \
  \|____|\  \ \  \    \ \  \ \  \ \  \ \  \\  \|   \ \  \
    ____\_\  \ \__\    \ \__\ \__\ \__\ \__\\ _\    \ \__\
   |\_________\|__|     \|__|\|__|\|__|\|__|\|__|    \|__|
   \|_________|

 _____ ______   ___  ________  ________  ________  ________
|\   _ \  _   \|\  \|\   __  \|\   __  \|\   __  \|\   __  \
\ \  \\\__\ \  \ \  \ \  \|\  \ \  \|\  \ \  \|\  \ \  \|\  \
 \ \  \\|__| \  \ \  \ \   _  _\ \   _  _\ \  \\\  \ \   _  _\
  \ \  \    \ \  \ \  \ \  \\  \\ \  \\  \\ \  \\\  \ \  \\  \
   \ \__\    \ \__\ \__\ \__\\ _\\ \__\\ _\\ \_______\ \__\\ _\
    \|__|     \|__|\|__|\|__|\|__|\|__|\|__|\|_______|\|__|\|__|

EOF

# Check processor archetecture.
if [ "$ARCH" == "armv6l" ] && [ "$ARCH" == "x86_64" ]; then
	printf "%s${red} Unupported device!${end} The smart-mirror only works on the Pi 2, 3 and 4"
	exit;
fi

printf "%sThis script will install the smart-mirror and it's dependencies.\n"
printf "%s${red}Please do not exit this script until it is complete.${end}\n"

# # Rotate the monitor
# printf "%s\n"
# read -r -p "Would you like to rotate your monitor? [y/N]" rotateResponse
# if [[ $rotateResponse =~ ^([yY][eE][sS]|[yY])$ ]]; then
#    # Rotate Display (replace the display_rotate line with display_rotate=1)
#     sed -i -e '$a\
# \
# #Rotate the display (smart-mirror)\
# display_rotate=1' /boot/config.txt
# fi
# Update before first apt-get
if [ $mac != 'Darwin' ]; then
	echo -e "\e[96mUpdating packages ...\e[90m" | tee -a $logfile
	upgrade=$false
	update=$(sudo apt-get update -y 2>&1)
	echo $update >> $logfile
	update_rc=$?
	if [ $update_rc -ne 0 ]; then
	 echo -e "\e[91mUpdate failed, retrying installation ...\e[90m" | tee -a $logfile
	 if [ $(echo $update | grep "apt-secure" | wc -l) -eq 1 ]; then
			update=$(sudo apt-get update -y --allow-releaseinfo-change 2>&1)
			echo $update >> $logfile
			update_rc=$?
			if [ $update_rc -ne 0 ]; then
				echo "second apt-get update failed" $update | ree -a $logfile
				exit 1
			else
				echo "second apt-get update completed ok" >> $logfile
				upgrade=$true
			fi
	 fi
	else
		echo "apt-get update  completed ok" >> $logfile
		upgrade=$true
	fi
	if [ $upgrade -eq $true ]; then
		upgrade_result=$(sudo apt-get upgrade -y 2>&1)
		upgrade_rc=$?
		echo apt upgrade result ="rc=$upgrade_rc $upgrade_result" >> $logfile
	fi

	# Installing helper tools
	echo -e "\e[96mInstalling helper tools ...\e[90m" | tee -a $logfile
	sudo apt-get install --assume-yes curl wget git build-essential unzip sox unclutter libatlas-base-dev>>$logfile
fi
# Install native dependencies
#printf "%s\n${blu}Installing native dependencies${end}\n"
#sudo apt-get install -y curl wget git
#libatlas-base-dev

# Check if we need to install or upgrade Node.js.
echo -e "\e[96mCheck current Node installation ...\e[0m" | tee -a $logfile
NODE_INSTALL=false
if command_exists node; then
	echo -e "\e[0mNode currently installed. Checking version number." | tee -a $logfile
	NODE_CURRENT=$(node -v)
	if [ "$NODE_CURRENT." == "." ]; then
	   NODE_CURRENT="V1.0.0"
		 echo forcing low Node version  >> $logfile
	fi
	echo -e "\e[0mMinimum Node version: \e[1m$NODE_TESTED\e[0m" | tee -a $logfile
	echo -e "\e[0mInstalled Node version: \e[1m$NODE_CURRENT\e[0m" | tee -a $logfile
	if verlte $NODE_CURRENT $NODE_TESTED; then
		echo -e "\e[96mNode should be upgraded.\e[0m" | tee -a $logfile
		NODE_INSTALL=true

		# Check if a node process is currenlty running.
		# If so abort installation.
		if pgrep "node" > /dev/null; then
			echo -e "\e[91mA Node process is currently running. Can't upgrade." | tee -a $logfile
			echo "Please quit all Node processes and restart the installer." | tee -a $logfile
			echo $(ps -ef | grep node | grep -v \-\-color) | tee -a $logfile
			exit;
		fi

	else
		echo -e "\e[92mNo Node.js upgrade necessary.\e[0m" | tee -a $logfile
	fi

else
	echo -e "\e[93mNode.js is not installed.\e[0m" | tee -a $logfile
	NODE_INSTALL=true
fi
# Install or upgrade node if necessary.
if $NODE_INSTALL; then

	echo -e "\e[96mInstalling Node.js ...\e[90m" | tee -a $logfile

	# Fetch the latest version of Node.js from the selected branch
	# The NODE_STABLE_BRANCH variable will need to be manually adjusted when a new branch is released. (e.g. 7.x)
	# Only tested (stable) versions are recommended as newer versions could break smart mirror.
	if [ $mac == 'Darwin' ]; then
	  brew install node
	else
		node_info=$(curl -sL https://deb.nodesource.com/setup_$NODE_STABLE_VERSION | sudo -E bash - )
		echo Node release info = $node_info >> $logfile
		if [ "$(echo $node_info | grep "not currently supported")." == "." ]; then
			sudo apt-get install -y nodejs
		else
			echo node $NODE_STABLE_VERSION version installer not available, doing manually >>$logfile
			# no longer supported install
			sudo apt-get install -y --only-upgrade libstdc++6 >> $logfile
			# have to do it manually
			node_vnum=$(echo $NODE_STABLE_BRANCH | awk -F. '{print $1}')
			# get the highest release number in the stable branch line for this processor architecture
			node_ver=$(curl -sL https://unofficial-builds.nodejs.org/download/release/index.tab | grep $ARM | grep -m 1 v$node_vnum | awk '{print $1}')
			echo latest release in the $NODE_STABLE_VERSION family for $ARCH is $node_ver >> $logfile
			curl -sL https://unofficial-builds.nodejs.org/download/release/$node_ver/node-$node_ver-linux-$ARCH.tar.gz >node_release-$node_ver.tar.gz
			cd /usr/local
			echo using release tar file = node_release-$node_ver.tar.gz >> $logfile
			sudo tar --strip-components 1 -xzf  $HOME/node_release-$node_ver.tar.gz
			cd - >/dev/null
			rm ./node_release-$node_ver.tar.gz
		fi
		# get the new node version number
		new_ver=$(node -v 2>&1)
		# if there is a failure to get it due to a missing library
		if [ $(echo $new_ver | grep "not found" | wc -l) -ne 0 ]; then
		  #
			sudo apt-get install -y --only-upgrade libstdc++6 >> $logfile
		fi
		echo node version is $(node -v 2>&1 >>$logfile)
	fi
	echo -e "\e[92mNode.js installation Done! version=$(node -v)\e[0m" | tee -a $logfile
fi
# Check if we need to install or upgrade npm.
echo -e "\e[96mCheck current NPM installation ...\e[0m" | tee -a $logfile
NPM_INSTALL=false
if command_exists npm; then
	echo -e "\e[0mNPM currently installed. Checking version number." | tee -a $logfile
	NPM_CURRENT='V'$(npm -v)
	echo -e "\e[0mMinimum npm version: \e[1m$NPM_TESTED\e[0m" | tee -a $logfile
	echo -e "\e[0mInstalled npm version: \e[1m$NPM_CURRENT\e[0m" | tee -a $logfile
	if verlte $NPM_CURRENT $NPM_TESTED; then
		echo -e "\e[96mnpm should be upgraded.\e[0m" | tee -a $logfile
		NPM_INSTALL=true

		# Check if a node process is currently running.
		# If so abort installation.
		if pgrep "npm" > /dev/null; then
			echo -e "\e[91mA npm process is currently running. Can't upgrade." | tee -a $logfile
			echo "Please quit all npm processes and restart the installer." | tee -a $logfile
			exit;
		fi

	else
		echo -e "\e[92mNo npm upgrade necessary.\e[0m" | tee -a $logfile
	fi

else
	echo -e "\e[93mnpm is not installed.\e[0m" | tee -a $logfile
	NPM_INSTALL=true
fi

# Install or upgrade node if necessary.
if $NPM_INSTALL; then

	echo -e "\e[96mInstalling npm ...\e[90m" | tee -a $logfile

  #
	# if this is a mac, npm was installed with node
	if [ $mac != 'Darwin' ]; then
		sudo apt-get install -y npm >>$logfile
	fi
	# update to the latest.
	echo upgrading npm to latest >> $logfile
	sudo sudo npm i -g npm  >>$logfile
	echo -e "\e[92mnpm installation Done! version=V$(npm -v)\e[0m" | tee -a $logfile
fi

#Install smart mirror
cd ~
if [ -d "$HOME/smart-mirror" ]; then
	printf "%s${red}Looks like the smart mirror is already installed.${end}\n"
	printf "%sPlease rename or remove the ${mag}smart-mirror${end} folder and re-run the installer.\n"
	printf "%sIf you want to upgrade your smart mirror run ${cyn}git pull${end} from the ~/smart-mirror directory.\n"
	exit;
fi

# Getting the code
printf "%s\n${blu}Cloning smart-mirror Git Repo${end}\n"
if git clone https://github.com/evancohen/smart-mirror.git; then
    printf "%s${grn}smart-mirror code is now downloaded${end}\n"

else
    printf "%s${red}Unable to clone smart-mirror :( ${end}\n"
    exit;
fi

# Install smart-mirror dependencies
printf "%s\n${blu}Installing smart-mirror dependencies...${end}\n"
printf "%s${yel}This may take a while. Go grab a beer :)${end}\n"
cd smart-mirror  || exit
if [ ! -f scripts/pm2_smart_mirror.json ]; then
echo -e '{
  "apps" : [{
    "name"        : "Smart Mirror",
    "script"      : "/home/pi/smart-mirror/scripts/bash-start.sh",
    "watch"       : ["/home/pi/smart-mirror/config.json"]
  }]
}' >scripts/pm2_smart_mirror.json
fi

if npm install; then
	printf "%s${grn}Dependency installation complete!${end}\n"
	# create the empty local.css
	touch app/css/local.css
else
	printf "%s${red}Unable to install dependencies :( ${end}\n"
	exit;
fi
if [ 0 -eq 1 ]; then
	# Apply LXDE unclutter autostart (if we haven't already)
	if [ -f  /etc/xdg/lxsession/LXDE/autostart ]; then
	#if ! sudo grep -q '(smart-mirror)' /etc/xdg/lxsession/LXDE/autostart; then
			sudo sed -i -e '$a\
	\
	#Hide the mouse when inactive (smart-mirror)\
	unclutter -idle 0.1 -root' /etc/xdg/lxsession/LXDE/autostart
	fi
fi

 #Use pm2 control like a service smart-mirror
read -p "Do you want use pm2 for auto starting of your smart-mirror (y/N)?" choice <&1
if [[ $choice =~ ^[Yy]$ ]]; then
      echo install and setup pm2 | tee -a $logfile
 			# assume pm2 will be found on the path
			pm2cmd=pm2
			# check to see if already installed
			pm2_installed=$(which $pm2cmd)
			up=
			if [ $mac == 'Darwin' ]; then
				 up="--unsafe-perm"
				 launchctl=launchctl
				 launchctl_path=$(which $launchctl)
				 `export PATH=$PATH:${launchctl_path%/$launchctl}`
			fi
			# check to see if already installed
			pm2_installed=$(which $pm2cmd)
			if [  "$pm2_installed." != "." ]; then
			    # does it work?
					pm2_fails=$(pm2 list | grep -i -m 1 "App Name" | wc -l )
					if [ $pm2_fails != 1 ]; then
					   # uninstall it
						 echo pm2 installed, but does not work, uninstalling >> $logfile
					   sudo npm uninstall $up -g pm2 >> $logfile
						 # force reinstall
				     pm2_installed=
					fi
			fi
			# if not installed
			if [  "$pm2_installed." == "." ]; then
				# install it.
				echo pm2 not installed, installing >>$logfile
				result=$(sudo npm install $up -g pm2 )
				echo pm2 install result $result >>$logfile
				# if this is a mac
				if [ $mac == 'Darwin' ]; then
					echo this is a mac, fixup for path >>$logfile
					# get the location of pm2 install
					# parse the npm install output to get the command
					pm2cmd=`echo $result | awk -F -  '{print $1}' | tr -d '[:space:]'`
					c='/pm2'
					# get the path only
					echo ${pm2cmd%$c} >scripts/pm2path
				fi
			fi
			echo get the pm2 platform specific startup command >>$logfile
			# get the platform specific pm2 startup command
			v=$($pm2cmd startup | tail -n 1)
			if [ $mac != 'Darwin' ]; then
				# check to see if we can get the OS package name (Ubuntu)
				if [ $(which lsb_release| wc -l) >0 ]; then
					# fix command
					# if ubuntu 18.04, pm2 startup gets something wrong
					if [ $(lsb_release  -r | grep -m1 18.04 | wc -l) > 0 ]; then
						 v=$(echo $v | sed 's/\/bin/\/bin:\/bin/')
					fi
				fi
			fi
			echo startup command = $v >>$logfile
			# execute the command returned
		  $v 2>&1 >>$logfile
			echo pm2 startup command done >>$logfile
			# is this is mac
			# need to fix pm2 startup, only on catalina
			if [ $mac == 'Darwin' ] && [ "$(sw_vers -productVersion | head -c 6)." == '10.15..' ]; then
			  # only do if the faulty tag is present (pm2 may fix this, before the script is fixed)
				if [ $(grep -m 1 UserName /Users/$USER/Library/LaunchAgents/pm2.$USER.plist | wc -l) -eq 1 ]; then
					# copy the pm2 startup file config
					cp  /Users/$USER/Library/LaunchAgents/pm2.$USER.plist .
					# edit out the UserName key/value strings
					sed -e '/UserName/{N;d;}' pm2.$USER.plist > pm2.$USER.plist.new
					# copy the file back
					sudo cp pm2.$USER.plist.new /Users/$USER/Library/LaunchAgents/pm2.$USER.plist
				fi
			fi

		# if the user is no pi, we have to fixup the pm2 json file
		echo configure the pm2 config file for smart mirror >>$logfile
		if [ "$USER"  != "pi" ]; then
			echo the user is not pi >>$logfile
			# go to the scripts folder
			cd scripts
			# edit the startup script for the right user
			echo change bash-start.sh >>$logfile
			 if [ ! -e bash-start_temp.sh ]; then
			   echo save copy of bash-start.sh >> $logfile
			   cp bash-start.sh bash-start_temp.sh
			 fi
			 if [ $(grep pi bash-start_temp.sh | wc -l) -gt 0 ]; then
			  echo change hard coded pi username  >> $logfile
				sed 's/pi/'$USER'/g' bash-start_temp.sh >bash-start.sh
			 else
			  if [ $HOME != 'home' ]; then
					echo change relative home path to hard coded path >> $logfile
					sed 's/home/$HOME/g' bash-start_temp.sh >bash-start.sh
				fi
			 fi
			# edit the pms config file for the right user
			echo change $PM2_FILE >>$logfile
			sed 's/pi/'$USER'/g' $PM2_FILE > pm2_smart_mirror_new.json
			# make sure to use the updated file
			PM2_FILE=pm2_smart_mirror_new.json
			# if this is a mac
			if [ $mac == 'Darwin' ]; then
				 # copy the path file to the system paths list
				 sudo cp ./pm2path /etc/paths.d
				 # change the name of the home path for mac
				 sed 's/home/Users/g' $PM2_FILE > pm2_smart_mirror_new1.json
				 # make sure to use the updated file
				 PM2_FILE=pm2_smart_mirror_new1.json
			fi
			echo now using this config file $PM2_FILE >>$logfile
			# go back one cd level
			cd - >/dev/null
		fi
		echo add usepm2 parm to npm start in bash-start.sh >> $logfile
		sed -i 's/npm start/npm start usepm2/' scripts/bash-start.sh
		echo start smart mirror via pm2 now >>$logfile
		# tell pm2 to start the app defined in the config file
		$pm2cmd start $HOME/smart-mirror/scripts/$PM2_FILE
		# tell pm2 to save that configuration, for start at boot
		echo save smart mirror pm2 config now  >>$logfile
		$pm2cmd save
		pm2setup=$true
fi

# Disable Screensaver
choice=n
read -p "Do you want to disable the screen saver? (y/N)?" choice <&1
if [[ $choice =~ ^[Yy]$ ]]; then
	if [ $mac == 'Darwin' ]; then
	  setting=$(defaults -currentHost read com.apple.screensaver idleTime)
		if [ $setting != 0 ] ; then
			echo disable screensaver via mac profile >> $logfile
			defaults -currentHost write com.apple.screensaver idleTime 0
		else
			echo mac profile screen saver already disabled >> $logfile
		fi
	else
	  # find out if some screen saver running

		# get just the running processes and args
		# just want the program name
		# find the 1st with 'saver' in it (should only be one)
		# if the process name is a path, parse it and get the last field ( the actual pgm name)

	  screen_saver_running=$(ps -A -o args | awk '{print $1}' | grep -m1 [s]aver | awk -F\/ '{print $NF}');

		# if we found something
		if [ "$screen_saver_running." != "." ]; then
		  # some screensaver running
			case "$screen_saver_running" in
			 mate-screensaver) echo 'mate screen saver' >>$logfile
			   #killall mate-screensaver >/dev/null 2>&1
			   #ms=$(which mate-screensaver-command)
			   #$ms -d >/dev/null 2>&1
						gsettings set org.mate.screensaver lock-enabled false	 2>/dev/null
						gsettings set org.mate.screensaver idle-activation-enabled false	 2>/dev/null
						gsettings set org.mate.screensaver lock_delay 0	 2>/dev/null
				 echo " $screen_saver_running disabled" >> $logfile
				 DISPLAY=:0  mate-screensaver  >/dev/null 2>&1 &
			   ;;
			 gnome-screensaver) echo 'gnome screen saver' >>$logfile
			   gnome_screensaver-command -d >/dev/null 2>&1
				 echo " $screen_saver_running disabled" >> $logfile
			   ;;
			 xscreensaver) echo 'xscreensaver running' | tee -a $logfile
				 if [ $(grep -m1 'mode:' ~/.xscreensaver | awk '{print $2}') != 'off' ]; then
					 sed -i 's/$xsetting/mode: off/' ~/.xscreensaver
					 echo " xscreensaver set to off" >> $logfile
				 else
				   echo " xscreensaver already disabled" >> $logfile
				 fi
			   ;;
			 gsd-screensaver | gsd-screensaver-proxy)
					setting=$(gsettings get org.gnome.desktop.screensaver lock-enabled)
					setting1=$(gsettings get org.gnome.desktop.session idle-delay)
					if [ "$setting $setting1" != 'false uint32 0' ]; then
						echo disable screensaver via gsettings was $setting and $setting1>> $logfile
						gsettings set org.gnome.desktop.screensaver lock-enabled false
						gsettings set org.gnome.desktop.screensaver idle-activation-enabled false
						gsettings set org.gnome.desktop.session idle-delay 0
					else
						echo gsettings screen saver already disabled >> $logfile
					fi
					;;
			 *) echo "some other screensaver $screen_saver_running" found | tee -a $logfile
			    echo "please configure it manually" | tee -a $logfile
			   ;;
		  esac
		elif [ $(which gsettings | wc -l) == 1 ]; then
			setting=$(gsettings get org.gnome.desktop.screensaver lock-enabled)
			setting1=$(gsettings get org.gnome.desktop.session idle-delay)
			if [ "$setting $setting1" != 'false uint32 0' ]; then
			  echo disable screensaver via gsettings was $setting and $setting1>> $logfile
				gsettings set org.gnome.desktop.screensaver lock-enabled false
				gsettings set org.gnome.desktop.screensaver idle-activation-enabled false
				gsettings set org.gnome.desktop.session idle-delay 0
			else
			  echo gsettings screen saver already disabled >> $logfile
			fi
		elif [ -e "/etc/lightdm/lightdm.conf" ]; then
		  # if screen saver NOT already disabled?
			if [ $(grep 'xserver-command=X -s 0 -dpms' /etc/lightdm/lightdm.conf | wc -l) == 0 ]; then
			  echo install screensaver via lightdm.conf >> $logfile
				sudo sed -i '/^\[Seat:\*\]/a xserver-command=X -s 0 -dpms' /etc/lightdm/lightdm.conf
				#sudo cp _myconf /etc/lightdm/lightdm.conf
				#rm _myconf >/dev/null
			else
			  echo screensaver via lightdm already disabled >> $logfile
			fi
		elif [ -d "/etc/xdg/lxsession" ]; then
		  currently_set=$(grep -m1 '\-dpms' /etc/xdg/lxsession/LXDE-pi/autostart)
			if [ "$currently_set." == "." ]; then
				echo disable screensaver via lxsession >> $logfile
				# turn it off for the future
				sudo su -c "echo -e '@xset s noblank\n@xset s off\n@xset -dpms' >> /etc/xdg/lxsession/LXDE-pi/autostart"
				# turn it off now
				export DISPLAY=:0; xset s noblank;xset s off;xset -dpms
			else
			  echo lxsession screen saver already disabled >> $logfile
			fi
		else
			echo " "
			echo -e "unable to disable screen saver, /etc/xdg/lxsession does not exist" | tee -a $logfile
		fi
	fi
fi

# Add start commands in the user's bashrc.
echo "export MIRROR_HOME=~/smart-mirror" >> ~/.bashrc
echo "run_mirror () { ( cd \$MIRROR_HOME && DISPLAY=:0 npm run \"\$@\" ); }" >> ~/.bashrc
echo "alias mirror=run_mirror" >> ~/.bashrc
cd ~ && exec bash

# The mirror is now installed, yay!
cat << "EOF"

        |        The smart-mirror is now installed!
       / \
      / _ \      To configure audio input, speech, and the mirror itself, please visit:
     |.o '.|     http://docs.smart-mirror.io
     |'._.'|
     |     |     To start your mirror:
   ,'|  |  |`.   > mirror start
  /  |  |  |  \
  |,-'--|--'-.|

EOF
# ASCII art found on http://textart.io/

exit 0
