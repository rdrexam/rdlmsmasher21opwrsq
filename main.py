from telegram.ext import Application, MessageHandler, filters, CallbackContext, CommandHandler
from telegram import Update
import requests
from tqdm import tqdm
import time
import re
from math import log
from telethon import TelegramClient
import asyncio
import aiohttp
import os
from pathlib import Path
import http.client
import json
import yt_dlp
from yt_dlp.utils import DownloadError

# Your API details
api_id = '22106990'       # Replace with your API ID
api_hash = 'f4b4d46f5dbdb6082a8a59c314f4ebe5'   # Replace with your API Hash

# Initialize client
client = TelegramClient('session_name', api_id, api_hash)

print("Starting Client!")

if "temp" not in os.listdir():
    os.mkdir("temp")

users_in_uploading = dict()

def is_valid_url(link):
    regex = re.compile(
        r'^(https?://)?'  # Optional scheme (http or https)
        r'([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}'  # Domain
        r'(/.*)?$'  # Optional path
    )
    return bool(regex.match(link))

def format_time_taken(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    
    time_str = ""
    if hours > 0:
        time_str += f"{hours}h "
    if minutes > 0 or hours > 0:
        time_str += f"{minutes}m "
    time_str += f"{seconds}s"
    
    return time_str

async def upload_temp_folder_videos_to_saved_messages(file_path,update: Update, context: CallbackContext):
    status_message = await update.message.reply_text(f"Uploading...")

    start_time = time.time()
    async def upload_to_saved_messages(file_path):
        file_name = str(file_path).split("/")[-1]
        await client.start()

        # Iterate through files in the given folder
        if True:
            try:
                print(f"Uploading {file_path}...")
                await status_message.edit_text(
                    f"📤 Uploading `{file_name}`\n💾 Size: {format_size(os.path.getsize(file_path))}\n⏳ Estimated Time: {format_time_taken(0.6 * format_size_only(os.path.getsize(file_path)))}\n\n🚀 Please wait... This might take a while!",
                    parse_mode='Markdown'
                )
                await client.send_file('me', file_path, caption=f"`{file_name}`", parse_mode='Markdown')
                end_time = time.time()
                await status_message.edit_text(
                    f"✅ Uploaded: `{file_name}`\n📦 Size: {format_size(os.path.getsize(file_path))}\n⏱ Time Taken: {format_time_taken(end_time - start_time)}",
                    parse_mode='Markdown'
                )
                os.remove(file_path)
                await update.message.reply_text("✅ Uploading Finished! 🎉")
                print(f"Uploaded {file_path}")
            except Exception as e:
                await status_message.edit_text(f"Error uploading `{file_name}`: {str(e)}", parse_mode='Markdown')
                print(f"Error in Upload {file_path}: {e}")

    await upload_to_saved_messages(file_path)

    return True

def format_size(size_bytes):
    """Convert bytes to KB, MB, GB, etc. and return as a formatted string."""
    if size_bytes == 0:
        return "0 Bytes"
    size_name = ("Bytes", "KB", "MB", "GB", "TB")
    i = int(log(size_bytes, 1024))
    p = pow(1024, i)
    size = round(size_bytes / p, 2)
    return f"{size} {size_name[i]}"

def format_size_only(size_bytes):
    """Convert bytes to KB, MB, GB, etc. and return as a formatted string."""
    if size_bytes == 0:
        return "0 Bytes"
    size_name = ("Bytes", "KB", "MB", "GB", "TB")
    i = int(log(size_bytes, 1024))
    p = pow(1024, i)
    return round(size_bytes / p, 2)

async def download_me(video_url, update: Update, context: CallbackContext):
    # Prepare user-specific download path
    user_id = update.effective_user.id
    user_folder = Path(f'files/temp')
    user_folder.mkdir(parents=True, exist_ok=True)

    # Notify user about download start
    status_msg = await update.message.reply_text("Starting download...")

    # Run the download in the background
    asyncio.create_task(background_download(update, context, status_msg, user_folder, video_url))

async def background_download(update: Update, context: CallbackContext, status_msg, user_folder: Path, file_url: str) -> None:
    """Performs the download in the background and updates the user about the progress."""
    try:
        if 'youtube' in file_url or 'youtu.be' in file_url:
            ydl_opts = {
                'outtmpl': f'{user_folder}/%(title)s.%(ext)s',
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(file_url, download=False)
                filename = ydl.prepare_filename(info)
                await status_msg.edit_text(f"Downloading... {info['title']}")
                ydl.download([file_url])
                await upload_temp_folder_videos_to_saved_messages(filename,update,context)
        else:
            async with aiohttp.ClientSession() as session:
                async with session.head(file_url) as head_resp:
                    if head_resp.status!= 200:
                        await status_msg.edit_text(f"Failed to access file. Status code: {head_resp.status}")
                        return

                    # Extract file name from Content-Disposition header
                    content_disposition = head_resp.headers.get('Content-Disposition')
                    if content_disposition and 'filename=' in content_disposition:
                        file_name = content_disposition.split('filename=')[-1].strip('"').strip("'")
                    else:
                        # Fallback to extracting from the URL
                        file_name = file_url.split('/')[-1] or "unknown_file"

                    # Check file size before downloading
                    content_length = head_resp.headers.get('Content-Length')
                    if content_length and int(content_length) > 4 * 1024 * 1024 * 1024:
                        await status_msg.edit_text(f"File is too large to download (limit: 4GB).")
                        return

                # Proceed with the download
                file_path = user_folder / file_name
                async with aiohttp.ClientSession() as session:
                    async with session.get(file_url) as resp:
                        if resp.status!= 200:
                            await status_msg.edit_text(f"Failed to download file. Status code: {resp.status}")
                            return

                        with open(file_path, 'wb') as file:
                            downloaded = 0
                            content_length = int(content_length) if content_length else None
                            last_reported_percentage = 0
                            last_update_time = asyncio.get_running_loop().time()
                            xc = True

                            # Download in chunks
                            async for chunk in resp.content.iter_chunked(8192):
                                file.write(chunk)
                                downloaded += len(chunk)

                                # Report download progress every 2 seconds
                                current_time = asyncio.get_running_loop().time()
                                if content_length and current_time - last_update_time >= 0.5:
                                    percentage = (downloaded / content_length) * 100
                                    bar_length = 15  # Length of the progress bar 
                                    filled_length = int(bar_length * downloaded // content_length)
                                    bar = '■' * filled_length + '□' * (bar_length - filled_length)
                                    try:
                                        await status_msg.edit_text(
                                            f"Downaloding...\n⬇️ |{bar}| {percentage:.2f}% ({format_size(content_length)})"
                                        )
                                    except:
                                        pass
                                    last_update_time = current_time
                                else:
                                    if xc:
                                        if content_length:
                                            await status_msg.edit_text(f"Downloading...")
                                        else:
                                            await status_msg.edit_text(f"Downloading... (Unknown File Size)")
                                        xc = False

            # Notify user of successful download
            await status_msg.edit_text(f"✅ Download completed! 🎉 Size: {format_size(os.path.getsize(file_path))}")
            await upload_temp_folder_videos_to_saved_messages(file_path,update,context)
    except yt_dlp.DownloadError as e:
        await status_msg.edit_text(f"Download failed: {str(e)}")
    except aiohttp.ClientError as e:
        await status_msg.edit_text(f"Download failed: {str(e)}")
    except Exception as e:
        await status_msg.edit_text(f"An error occurred: {str(e)}")

async def start(update: Update, context: CallbackContext) -> None:
    await update.message.reply_text("👋 Hi! Please send me the video file link to download. 📥")

def main():
    API_TOKEN = "7710008103:AAGGL4V1HKtk2jvcWzAfbRpo5hxq2P8Bpog"
    application = Application.builder().token(API_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
    application.run_polling()

async def echo(update: Update, context: CallbackContext) -> None:
    user_input_original = update.message.text
    user_id = update.effective_user.id
    reply_message = await handle_message(user_id,user_input_original,update,context)
    if reply_message == False:
        await update.message.reply_text("❌ Invalid Link! Please try again.")

async def handle_message(user_id,user_message,update: Update, context: CallbackContext) -> None:
    if is_valid_url(user_message):
        return await download_me(user_message,update,context)
    else:
        return False

if __name__ == '__main__':
    print("IzzyBot running...")
    main()
