# TorrentsComposer Migration Plan

## File: `src/composers/TorrentsComposer.ts` (1004 lines)

## 📊 Current Structure

### Handlers Registration (lines 87-103)

- `/dl_file_{uid}_{index}` → handleDownloadFileCommand()
- `/dl_{uid}` → handleDownloadCommand()
- `/rm_{uid}` → handleRemoveCommand()
- `/ls_{uid}` → handleListFilesCommand()
- `/torrents` → handleTorrentsListCommand()

### Callback Query Handler (lines 103-177)

- `torrents:page:{page}` → refresh torrent list
- `torrents:refresh` → refresh torrent list
- `torrents:files:{uid}` → show torrent files
- `torrents:remove:{uid}` → remove torrent

### Text Message Handler (lines 178-182)

- Text input → handleSearchQuery()

---

## 🎯 Target Handlers & Logic Mapping

### 1. **SearchHandler** (lines 187-220, 685-699)

- ✅ Already exists with basic search functionality
- ❌ Missing: `formatSearchResult()`, pagination for search results
- ❌ Missing: inline keyboard with pagination for search
- **Lines to migrate**: 187-220 (handleSearchQuery), 685-699 (searchTorrents), 920-943 (formatSearchResult)

### 2. **TorrentHandler** (lines 220-282, 283-299, 317-504, 542-684, 717-754, 764-822, 822-914)

- ✅ Already has `handleDownloadCommand()`, `handleRemoveCommand()`
- ❌ Missing: `handleTorrentsListCommand()` with inline keyboard pagination
- ❌ Missing: callback query handling for pagination/refresh/files/remove
- ❌ Missing: `formatTorrent()`, `createOrUpdateTorrentsMessage()`
- **Lines to migrate**:
  - 220-282: handleDownloadCommand
  - 283-299: handleRemoveCommand
  - 317-504: handleTorrentsListCommand
  - 542-684: removeTorrentByUid
  - 717-754: buildTorrentsList
  - 764-822: createOrUpdateTorrentsMessage
  - 822-914: createOrUpdateTorrentsMessages
  - 944-978: formatTorrent

### 3. **FileHandler** (lines 300-336, 505-541, 742-753)

- ✅ Already has `handleListFilesCommand()`
- ❌ Missing: callback for `torrents:files:{uid}`
- ❌ Missing: `formatTorrentFile()`
- **Lines to migrate**:
  - 300-336: handleListFilesCommand
  - 505-541: sendTorrentFilesByUid
  - 742-753: getTorrentFiles
  - 979-1003: formatTorrentFile

### 4. **MediaHandler** (lines 336-504)

- ✅ Already exists but minimal
- ❌ **MAJOR**: All FFmpeg/transcoding logic (lines 336-504) is in TorrentsComposer
- ❌ Missing: MediaService for FFmpeg abstraction
- ❌ Missing: `handleThumbnailCommand()`, `handlePreviewCommand()`
- **Lines to migrate**:
  - 336-504: handleDownloadFileCommand (contains all FFmpeg logic)
  - 979-1003: formatTorrentFile (includes file type detection)

### 5. **DownloadHandler** (lines 220-282, 699-726)

- ✅ Already has `handleDownloadFileCommand()` (basic)
- ❌ Missing: full `addTorrent()` logic with metadata handling
- ❌ Missing: `getTorrentByUid()`
- **Lines to migrate**:
  - 220-282: handleDownloadCommand
  - 699-726: addTorrent
  - 726-742: getTorrentByUid

---

## 📋 Migration Tasks Priority

### PRIORITY 1: Create MediaService (Foundation)

**Why**: FFmpeg logic is 150+ lines and complex, needs extraction first
**Files to create**:

- `src/domain/services/MediaService.ts` (NEW)
  - `transcodeVideo(input, output, bitrate)`
  - `generateThumbnail(videoPath, outputPath)`
  - `generatePreview(videoPath, outputPath)`
  - `isVideo(filename)`

### PRIORITY 2: Migrate Search Logic to SearchHandler

**Why**: Already exists, just needs enhancement
**Tasks**:

- Add `formatSearchResult()` to SearchHandler
- Add inline keyboard with pagination
- Migrate lines 187-220, 685-699, 920-943

### PRIORITY 3: Migrate Torrent List to TorrentHandler

**Why**: Core feature, heavily used
**Tasks**:

- Add `handleTorrentsListCommand()` with inline keyboard
- Add callback query handlers for pagination/refresh
- Migrate lines 317-504, 576-684, 717-822

### PRIORITY 4: Migrate File Operations to FileHandler

**Why**: Straightforward migration
**Tasks**:

- Add callback handler for `torrents:files:{uid}`
- Migrate lines 505-541, 742-753, 979-1003

### PRIORITY 5: Clean up index.ts

**Why**: Remove TorrentsComposer dependency
**Tasks**:

- Replace `bot.use(torrentsComposer)` with individual handlers
- Remove `torrentsComposer.dispose()` call
- Update imports

### PRIORITY 6: Remove TorrentsComposer

**Why**: After migration, it's obsolete
**Tasks**:

- Verify all handlers work correctly
- Delete `src/composers/TorrentsComposer.ts`
- Delete `src/composers/AuthComposer.ts` (if unused)

---

## 🎯 Success Criteria

- [ ] All 1004 lines of TorrentsComposer are migrated
- [ ] Each handler has single responsibility (≤ 200 lines)
- [ ] No code duplication
- [ ] All handlers registered in index.ts
- [ ] All tests pass
- [ ] Manual testing: search, download, list, remove, files work correctly
