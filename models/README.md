# AI Models

## MediaPipe Pose Landmarker

The MediaPipe model file (`pose_landmarker.task`) is **not committed to git** (5.7 MB binary).

### Download Instructions

**Option A — PowerShell:**
```powershell
Set-Location "d:\tmp\3d model\models"
Invoke-WebRequest -Uri "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task" -OutFile "pose_landmarker.task"
```

**Option B — Python (run from project root):**
```python
import urllib.request, pathlib
url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
pathlib.Path("models").mkdir(exist_ok=True)
urllib.request.urlretrieve(url, "models/pose_landmarker.task")
print("Downloaded!")
```

**Option C — curl:**
```bash
curl -L -o models/pose_landmarker.task \
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
```
