import compact from 'lodash.compact';
import child from 'child_process';

function parseSection(line, section) {
  var values = compact(line.toString().split(/\s+/g))
	if(values[3] === 'TXT'){
    var data = line.toString().split("\"");
    values = compact(data[0].toString().split(/\s+/g))
    values.push(data[1])
	}
  if (
    section === 'answer' ||
    section === 'additional') {
    return {
      domain: values[0],
      type: values[3],
      ttl: values[1],
      class: values[2],
      value: values[values.length - 1],
    };
  }
  return values;
}

function parse(output = '') {
  const regex = /(;; )([^\s]+)( SECTION:)/g;
  const result = {};
  const data = output.split(/\r?\n/);
  let section = 'header';
  if (data.length < 6) {
    let msg = data[data.length - 2];
    if (!msg || msg.length <= 1) {
      msg = output;
    }
    throw new Error(msg);
  }
  data.forEach((line, i) => {
    let m;
    let changed = false;
    if (i && !line) section = '';
    else {
      do {
        m = regex.exec(line);
        if (m) {
          changed = true;
          section = m[2].toLowerCase();
        }
      } while (m);
    }
    if (section) {
      if (!result[section]) result[section] = [];
      if (!changed && line) {
        if (section === 'header') result[section].push(parseSection(compact(line.split(/\t/)), section));
        else result[section].push(parseSection(line, section));
      }
    }
  });
  result.time = Number(data[data.length - 6].replace(';; Query time: ', '').replace(' msec', ''));
  result.server = data[data.length - 5].replace(';; SERVER: ', '');
  result.datetime = data[data.length - 4].replace(';; WHEN: ', '');
  result.size = Number(data[data.length - 3].replace(';; MSG SIZE  rcvd: ', ''));
  return result;
}

const dig = function dig(args = [], options = {}) {
  const raw = (options.raw === true) ? options.raw : args.includes('+short');
  const digCMD = options.dig || 'dig';
  return new Promise((resolve, reject) => {
    const process = child.spawn(digCMD, args);
    let shellOutput = '';

    process.stdout.on('data', (chunk) => {
      shellOutput += chunk;
    });

    process.stdout.on('error', (error) => {
      reject(error);
    });

    process.stdout.on('end', () => {
      try {
        const result = (raw !== true) ?
          parse(shellOutput) :
          shellOutput.replace(/\n$/, '');
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });
};

export default dig;
module.exports = dig;
