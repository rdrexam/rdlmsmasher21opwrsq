import requests
from tqdm import tqdm
import os


def download_video(video_url, destination):
    """Download video from the provided URL with a progress bar."""
    try:
        # Step 1: Send a GET request to the video URL
        response = requests.get(video_url, stream=True)
        response.raise_for_status()  # Raise an error for bad responses

        # Get the total file size
        total_size = int(response.headers.get('content-length', 0))

        # Step 2: Save the video file locally with a progress bar
        with open(destination, "wb") as file, tqdm(
            desc="Downloading",
            total=total_size,
            unit='B',
            unit_scale=True,
            unit_divisor=1024,
        ) as progress:
            for chunk in response.iter_content(chunk_size=32768):
                if chunk:
                    file.write(chunk)
                    progress.update(len(chunk))
        print("Download completed!")
    except requests.exceptions.HTTPError as err:
        print(f"HTTP error occurred: {err}")
    except Exception as err:
        print(f"An error occurred: {err}")


def get_links():
    names,links = [],[]
    with open("links.txt",'r') as f:
        ab = f.read().split("\n")

    for i in range(len(ab)):
        if i%2 == 0:
            names.append(ab[i].replace("|","-"))
        else:
            links.append(ab[i])
    return names,links

#names, links = get_links()
names = ['andriod.mp4']
links = [

'https://rr4---sn-8xgp1vo-p5qee.googlevideo.com/videoplayback?expire=1736962494&ei=Xp2HZ97ONtS1kucPldPwuA8&ip=208.195.169.102&id=o-ACe8Y93vb9rsSHmAW1LeEyqETU_4UxSBalYrLa2zT8dM&itag=18&source=youtube&requiressl=yes&xpc=EgVo2aDSNQ%3D%3D&met=1736940894%2C&mh=Cr&mm=31%2C26&mn=sn-8xgp1vo-p5qee%2Csn-ab5l6nk6&ms=au%2Conr&mv=m&mvi=4&pl=19&rms=au%2Cau&initcwndbps=4473750&bui=AY2Et-PdYIXKMVI5t2YlwZMOGQgbyrpcrXvW3fVN3LvPg-NzAfu87cRIkR0Q_1Cz6At7PshAyzODwg2t&spc=9kzgDQM-BaHhjhrdX0GQDP0ouxlRjrSjVMlAno79w3E8_0uLsY-k&vprv=1&svpuc=1&mime=video%2Fmp4&ns=DL34BO0VOhSWe58xrT3QN5gQ&rqh=1&gir=yes&clen=474340679&ratebypass=yes&dur=7260.903&lmt=1736793364005035&mt=1736940549&fvip=2&fexp=51326932%2C51335594%2C51353498%2C51355912%2C51371294%2C51384461&c=WEB&sefc=1&txp=5538534&n=OnPNEXgLmI4PRw&sparams=expire%2Cei%2Cip%2Cid%2Citag%2Csource%2Crequiressl%2Cxpc%2Cbui%2Cspc%2Cvprv%2Csvpuc%2Cmime%2Cns%2Crqh%2Cgir%2Cclen%2Cratebypass%2Cdur%2Clmt&sig=AJfQdSswRAIgXPvJORp9TXel40Qs5adrnwX9iuQWUhQsrsYMz51Mf1gCICDePrHQpV9hNjwXtMLeNDjSj8a4n9JZJ3tx77nJwH2M&lsparams=met%2Cmh%2Cmm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Crms%2Cinitcwndbps&lsig=AGluJ3MwRQIgHCjH0hv_FSMfx9nkUn6W658mELVTfUbj1otAqfLKAOACIQDdbx6wSIs_KltccumEh3IEZ5H05g6Mazhnwh_gp__aXg%3D%3D&pot=MnRFAJNQ15k8LEU4a1BEjDOO2j8jFF4PGcCUOh_OvPZLgWgwFcZqjB8vz4FqsZ5WvB29HhqOnt98dIuntRCwO3Zf7bxH3g1EsdZjcy_llz0EYBYg00YbcGrv6jdW1OTYr_EHJkWHYcB66iVoh_FK3lMqK7GOjg=='
         ]

for i in range(len(links)):
    video_url = links[i]
    local_file = f"{names[i]}"
    # Download the video
    print(f"Downloading {names[i]}...")
    download_video(video_url, local_file)
