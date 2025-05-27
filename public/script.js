const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileElem');
const fileSelectBtn = document.getElementById('fileSelect');
const uploadBtn = document.getElementById('uploadBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadLinkInput = document.getElementById('downloadLink');
const deleteBtn = document.getElementById('deleteBtn');
const deleteLinkInput = document.getElementById('deleteLinkId');
const messageDiv = document.getElementById('message');

let filesToUpload = [];

// Drag & Drop events
dropArea.addEventListener('dragover', e => {
  e.preventDefault();
  dropArea.classList.add('dragover');
});
dropArea.addEventListener('dragleave', e => {
  e.preventDefault();
  dropArea.classList.remove('dragover');
});
dropArea.addEventListener('drop', e => {
  e.preventDefault();
  dropArea.classList.remove('dragover');
  filesToUpload = e.dataTransfer.files;
  messageDiv.textContent = filesToUpload.length + ' file(s) selected.';
});

// File select button
fileSelectBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  filesToUpload = fileInput.files;
  messageDiv.textContent = filesToUpload.length + ' file(s) selected.';
});

// Upload files
// Upload files
uploadBtn.addEventListener('click', () => {
  if (filesToUpload.length === 0) {
    messageDiv.style.color = 'red';
    messageDiv.textContent = 'No files selected to upload!';
    return;
  }

  const formData = new FormData();
  formData.append('file', filesToUpload[0]); // Only uploading the first file

  fetch('/upload', {
    method: 'POST',
    body: formData
  })
    .then(async (res) => {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      } else {
        const text = await res.text();
        throw new Error("Unexpected response:\n" + text);
      }
    })
    .then(data => {
      messageDiv.style.color = 'green';
      messageDiv.innerHTML = `Upload successful!<br>Download link:<br><a href="${data.link}" target="_blank">${data.link}</a><br>
        Link ID for delete: <code>${data.link.split('/').pop()}</code>`;
      filesToUpload = [];
      fileInput.value = '';
    })
    .catch(err => {
      messageDiv.style.color = 'red';
      messageDiv.textContent = 'Upload failed: ' + err.message;
    });
});


// Download file by link
downloadBtn.addEventListener('click', () => {
  const url = downloadLinkInput.value.trim();
  if (!url) {
    messageDiv.style.color = 'red';
    messageDiv.textContent = 'Please enter a download link!';
    return;
  }
  window.open(url, '_blank');
});

// Delete file by link ID
deleteBtn.addEventListener('click', () => {
  const linkId = deleteLinkInput.value.trim();
  if (!linkId) {
    messageDiv.style.color = 'red';
    messageDiv.textContent = 'Please enter a link ID to delete!';
    return;
  }

  fetch('/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `linkId=${encodeURIComponent(linkId)}`
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to delete file');
      return res.text();
    })
    .then(msg => {
      messageDiv.style.color = 'green';
      messageDiv.textContent = msg;
    })
    .catch(err => {
      messageDiv.style.color = 'red';
      messageDiv.textContent = 'Delete failed: ' + err.message;
    });
});
