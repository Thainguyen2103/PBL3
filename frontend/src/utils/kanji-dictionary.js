import kanjiBase from './kanji-base.json';
import radicalsSource from './radicals-source.json';

export const allDictionaryData = [...kanjiBase, ...radicalsSource];
export const flashcardData = kanjiBase;
export const searchAndGraphData = allDictionaryData;