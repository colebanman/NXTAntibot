import requests
import threading
import datetime
endpoint = "http://localhost:5123/main.js"
# endpoint = "https://example.com"
threads = 1
barrier = threading.Barrier(threads + 1)  # Create a Barrier object with a count of threads + 1

import time
time.sleep(2)

def attack():
    st = datetime.datetime.now()
    try:
        barrier.wait()  # Wait for all threads to reach the barrier
        r = requests.get(endpoint)
        print(r.status_code)
    except requests.exceptions.RequestException as e:
        print("An error occurred:", e)
    et = datetime.datetime.now()
    print("Time taken: ", et - st)


threadArr = []
for i in range(threads):
    tempThread = threading.Thread(target=attack)
    threadArr.append(tempThread)

for thread in threadArr:
    thread.start()

barrier.wait()  # Wait for the main thread to reach the barrier



