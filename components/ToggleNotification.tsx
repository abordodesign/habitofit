var initialOpen: boolean = true;
const blip: Element | null = document.querySelector('.blip');
const button: Element | null = document.querySelector('button');
const notification: Element | null = document.querySelector('.notification');
const closeN: Element | null = document.querySelector('.close');
const image: Element | null = document.querySelector('.profile-img');
const text: Element | null = document.querySelector('.text');

function toggleNotification(): void {
  if (initialOpen) {
    initialOpen = false;
    blip?.classList.add('hide');
  }

  if (notification?.classList.contains('open')) {
    image?.classList.toggle('show');
    text?.classList.toggle('show');

    setTimeout(() => {
      notification?.classList.toggle('open');
    }, 50);
  } else {
    notification?.classList.toggle('open');

    setTimeout(() => {
      image?.classList.toggle('show');
      text?.classList.toggle('show');
    }, 150);
  }
}

button?.addEventListener('click', toggleNotification);
closeN?.addEventListener('click', toggleNotification);

export {toggleNotification}