import React, { useState } from "react";
import { Upload, Music, FileText } from "lucide-react";

const MusicXMLParser = () => {
  const [parsedData, setParsedData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const parseNote = (noteElement) => {
    const note = {
      type: "note",
      pitch: null,
      duration: null,
      isRest: false,
      dynamics: null,
      articulations: [],
    };

    // Vérifier si c'est un silence
    const restElement = noteElement.querySelector("rest");
    if (restElement) {
      note.isRest = true;
    } else {
      // Parser la hauteur de note
      const pitchElement = noteElement.querySelector("pitch");
      if (pitchElement) {
        const step = pitchElement.querySelector("step")?.textContent;
        const octave = pitchElement.querySelector("octave")?.textContent;
        const alter = pitchElement.querySelector("alter")?.textContent;

        note.pitch = {
          step,
          octave: parseInt(octave),
          alter: alter ? parseInt(alter) : 0,
        };
      }
    }

    // Durée
    const durationElement = noteElement.querySelector("duration");
    if (durationElement) {
      note.duration = parseInt(durationElement.textContent);
    }

    // Type de note (noire, croche, etc.)
    const typeElement = noteElement.querySelector("type");
    if (typeElement) {
      note.noteType = typeElement.textContent;
    }

    // Nuances (dynamics)
    const notations = noteElement.querySelector("notations");
    if (notations) {
      const dynamics = notations.querySelector("dynamics");
      if (dynamics) {
        const dynamicType = dynamics.children[0]?.tagName.toLowerCase();
        note.dynamics = dynamicType;
      }

      // Articulations
      const articulations = notations.querySelector("articulations");
      if (articulations) {
        Array.from(articulations.children).forEach((art) => {
          note.articulations.push(art.tagName);
        });
      }
    }

    return note;
  };

  const parseMeasure = (measureElement) => {
    const measure = {
      number: measureElement.getAttribute("number"),
      notes: [],
      attributes: null,
    };

    // Parser les attributs (clé, tempo, signature temporelle)
    const attributes = measureElement.querySelector("attributes");
    if (attributes) {
      measure.attributes = {
        divisions: attributes.querySelector("divisions")?.textContent,
        key: null,
        time: null,
        clef: null,
      };

      const key = attributes.querySelector("key");
      if (key) {
        measure.attributes.key = {
          fifths: key.querySelector("fifths")?.textContent,
          mode: key.querySelector("mode")?.textContent,
        };
      }

      const time = attributes.querySelector("time");
      if (time) {
        measure.attributes.time = {
          beats: time.querySelector("beats")?.textContent,
          beatType: time.querySelector("beat-type")?.textContent,
        };
      }

      const clef = attributes.querySelector("clef");
      if (clef) {
        measure.attributes.clef = {
          sign: clef.querySelector("sign")?.textContent,
          line: clef.querySelector("line")?.textContent,
        };
      }
    }

    // Parser toutes les notes de la mesure
    const notes = measureElement.querySelectorAll("note");
    notes.forEach((noteElement) => {
      measure.notes.push(parseNote(noteElement));
    });

    // Parser les nuances au niveau de la mesure
    const directions = measureElement.querySelectorAll("direction");
    directions.forEach((direction) => {
      const dynamics = direction.querySelector("dynamics");
      if (dynamics && measure.notes.length > 0) {
        const dynamicType = dynamics.children[0]?.tagName.toLowerCase();
        measure.notes[0].dynamics = dynamicType;
      }
    });

    return measure;
  };

  const parsePart = (partElement, partName) => {
    const part = {
      instrument: partName,
      measures: [],
    };

    const measures = partElement.querySelectorAll("measure");
    measures.forEach((measureElement) => {
      part.measures.push(parseMeasure(measureElement));
    });

    return part;
  };

  const parseMusicXML = (xmlText) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    const score = {
      title: xmlDoc.querySelector("work-title")?.textContent || "Sans titre",
      composer:
        xmlDoc.querySelector('creator[type="composer"]')?.textContent ||
        "Inconnu",
      instruments: [],
    };

    // Récupérer les noms des instruments
    const partList = xmlDoc.querySelector("part-list");
    const instrumentMap = new Map();

    if (partList) {
      const scoreParts = partList.querySelectorAll("score-part");
      scoreParts.forEach((scorePart) => {
        const id = scorePart.getAttribute("id");
        const name = scorePart.querySelector("part-name")?.textContent || id;
        instrumentMap.set(id, name);
      });
    }

    // Parser chaque partie
    const parts = xmlDoc.querySelectorAll("part");
    parts.forEach((partElement) => {
      const id = partElement.getAttribute("id");
      const instrumentName = instrumentMap.get(id) || id;
      score.instruments.push(parsePart(partElement, instrumentName));
    });

    return score;
  };

  const handleFile = (file) => {
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const xmlText = e.target.result;
        const parsed = parseMusicXML(xmlText);
        setParsedData(parsed);
      } catch (error) {
        console.error("Erreur lors du parsing:", error);
        alert("Erreur lors du parsing du fichier MusicXML");
      }
    };

    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (
      file &&
      (file.name.endsWith(".xml") || file.name.endsWith(".musicxml"))
    ) {
      handleFile(file);
    } else {
      alert("Veuillez déposer un fichier MusicXML (.xml ou .musicxml)");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const downloadJSON = () => {
    const json = JSON.stringify(parsedData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.(xml|musicxml)$/, ".json");
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Music className="w-16 h-16 mx-auto mb-4 text-purple-600" />
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Parseur MusicXML
          </h1>
          <p className="text-gray-600">
            Déposez un fichier MusicXML pour l'analyser
          </p>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-4 border-dashed rounded-xl p-12 mb-8 text-center transition-all ${
            isDragging
              ? "border-purple-500 bg-purple-50 scale-105"
              : "border-gray-300 bg-white hover:border-purple-400"
          }`}
        >
          <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-xl text-gray-600 mb-4">
            Glissez-déposez un fichier MusicXML ici
          </p>
          <p className="text-gray-500 mb-4">ou</p>
          <label className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-purple-700 transition-colors">
            Choisir un fichier
            <input
              type="file"
              accept=".xml,.musicxml"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>

        {parsedData && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {parsedData.title}
                </h2>
                <p className="text-gray-600">
                  Compositeur: {parsedData.composer}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Fichier: {fileName}
                </p>
              </div>
              <button
                onClick={downloadJSON}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <FileText className="w-5 h-5" />
                Télécharger JSON
              </button>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-700">
                Instruments ({parsedData.instruments.length})
              </h3>

              {parsedData.instruments.map((instrument, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg p-6 bg-gray-50"
                >
                  <h4 className="text-lg font-semibold text-purple-700 mb-4">
                    {instrument.instrument}
                  </h4>
                  <p className="text-gray-600 mb-2">
                    Nombre de mesures: {instrument.measures.length}
                  </p>
                  <p className="text-gray-600">
                    Nombre total de notes:{" "}
                    {instrument.measures.reduce(
                      (acc, m) => acc + m.notes.length,
                      0,
                    )}
                  </p>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-purple-600 font-medium hover:text-purple-700">
                      Voir les détails des mesures
                    </summary>
                    <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                      {instrument.measures.slice(0, 10).map((measure, midx) => (
                        <div
                          key={midx}
                          className="bg-white p-4 rounded border border-gray-200"
                        >
                          <p className="font-semibold text-gray-700 mb-2">
                            Mesure {measure.number}
                          </p>
                          <p className="text-sm text-gray-600">
                            {measure.notes.length} notes/silences
                          </p>
                          {measure.notes.slice(0, 5).map((note, nidx) => (
                            <div
                              key={nidx}
                              className="text-xs text-gray-500 mt-1"
                            >
                              {note.isRest
                                ? `Silence (${note.noteType})`
                                : `Note: ${note.pitch?.step}${note.pitch?.octave} (${note.noteType})${note.dynamics ? ` - ${note.dynamics}` : ""}`}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-gray-100 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">Aperçu JSON:</h4>
              <pre className="text-xs bg-gray-800 text-green-400 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(parsedData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicXMLParser;
