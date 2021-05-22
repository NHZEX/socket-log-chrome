import { join } from 'lodash'

function component() {
    const element = document.createElement('div');

    // Lodash, currently included via a script, is required for this line to work
    element.innerHTML = join(['Hello', 'webpack', '123'], ' ');

    return element;
}

document.body.appendChild(component());
