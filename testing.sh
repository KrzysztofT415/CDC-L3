#!/bin/bash
exitFun () {
    echo "exit"

    rm -f ./out/tmpFile1
    rm -f ./out/tmpFile2
    rmdirIfEmpty out
    rm -f tmp/tmpPipe
    rmdirIfEmpty tmp

    jobs -p | xargs kill 2>/dev/null
}

clear
summary="Summary\n"
echo -e "STARTED TESTING..."

mkdir -p tmp
mkfifo tmp/tmpPipe

sender () {
    while true; do
        if read line; then
            echo $line
        fi
    done <tmp/tmpPipe
}

sender <&- | ts-node main.ts &
nodepid=$(ps -f | grep -e "main.ts" | awk -F ' ' '{if($8=="node") print $2}')
trap "wait $nodepid; exitFun" EXIT

waitForTmp () {
    until [ -f "out/tmpFile$1" ]; do
        sleep 2
    done
}

rmdirIfEmpty () {
    if [ -d $1 ] && ! [[ "$(ls -A $1)" ]]; then
        rm -rf $1
    fi
}

declare -a types=("omega" "gamma" "delta" "fib")

for fileName in ./test/*; do
    for type in "${types[@]}"; do
        echo -e "\e[34m--------------\e[0m\nTEST: "$fileName" - "$type
        echo -e "$fileName encode $type tmpFile1" > ./tmp/tmpPipe
        waitForTmp 1
        echo -e "\e[34m--------------\e[0m"
        echo -e "./out/tmpFile1 decode $type tmpFile2" > ./tmp/tmpPipe
        waitForTmp 2
        if diff "$fileName" "out/tmpFile2" >/dev/null; then
            summary=$summary"\e[37m"$fileName" - "$type"\t\e[0m => \e[32m[Passed]\e[0m\n"
            echo -e "\e[32m[Passed]\e[0m";
        else
            summary=$summary"\e[37m"$fileName" - "$type"\t\e[0m => \e[31m[Failed]\e[0m\n"
            echo -e "\e[31m[Failed]\e[0m";
        fi
        rm ./out/tmpFile1 ./out/tmpFile2
    done
done

sleep 1
echo -e "\n" > tmp/tmpPipe
kill $nodepid
trap "exitFun $nodepid" EXIT
echo -e "\n\e[34m--------------\e[0m"
echo -en $summary
exit 0