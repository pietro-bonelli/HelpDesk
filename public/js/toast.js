let container;

document.addEventListener('DOMContentLoaded', () => {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
});

function showToast(title, message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = 'toast-item ' + type;

    let iconClass;
    if(type === 'success') iconClass = 'fa-regular fa-circle-check';
    if(type === 'error') iconClass = 'fa-regular fa-circle-xmark';
    if(type === 'warning') iconClass = 'fa-solid fa-circle-exclamation';
    if(type === 'info') iconClass = 'fa-solid fa-circle-info';

    const toastIcon = document.createElement('i');
    toastIcon.className = iconClass + " toast-icon";
    toast.appendChild(toastIcon);

    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';

    const toastTitle = document.createElement('p');
    toastTitle.className = "toast-title";
    toastTitle.textContent = title;
    toastContent.appendChild(toastTitle);

    const toastText = document.createElement('p');
    toastText.className = "toast-text";
    toastText.textContent = message;
    toastContent.appendChild(toastText);

    toast.appendChild(toastContent);
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 10);

    setTimeout(() => {
        toast.classList.add('toast-hide');
        toast.classList.remove('toast-show');

        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, duration);
}