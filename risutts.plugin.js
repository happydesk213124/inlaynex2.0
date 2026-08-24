//@name risutts
//@display-name RisuTTS v0.7.0
//@api 3.0
//@version 0.7.0
//@link https://github.com/Aratako/Irodori-TTS-Server Irodori-TTS-Server
//@link https://huggingface.co/Aratako/Irodori-TTS-600M-v3-VoiceDesign VoiceDesign v3

(async () => {
  const api = globalThis.Risuai || globalThis.risuai;
  if (!api) {
    console.log("[RisuTTS] RisuAI plugin API was not found.");
    return;
  }

  const CONFIG_KEY = "risutts.config.v1";
  const TRANSLATION_CACHE_KEY = "risutts.translationCache.v1";
  const VOICE_REFERENCES_KEY = "risutts.voiceReferences.v1";
  const SETTINGS_ID = "risutts-settings";
  const PLUGIN_VERSION = "0.7.0";
  const PLUGIN_DISPLAY_NAME = `RisuTTS v${PLUGIN_VERSION}`;
  const BINDING_TOKEN = `risutts-${PLUGIN_VERSION}`;
  const RUNTIME_SINGLETON_KEY = "__risuttsRuntime";
  const RUNTIME_INSTANCE_ID = `${PLUGIN_VERSION}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const PLUGIN_STORAGE_SCHEMA_VERSION = 3;
  const SHARED_VOICE_METADATA_APP = "RisuTTS";
  const SHARED_VOICE_METADATA_SCHEMA_VERSION = 1;
  const SHARED_VOICE_METADATA_VERSION = 2;
  const SHARED_VOICE_PROFILE_VERSION = 1;
  const RISUTTS_MENU_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>';
  const RISUTTS_READ_ALL_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5.8c0-.8.9-1.3 1.6-.8l8.5 6.2c.6.5.6 1.4 0 1.8l-8.5 6.2c-.7.5-1.6 0-1.6-.8V5.8z"></path></svg>';
  const DEFAULT_TTS_MODEL_ENDPOINT = "http://127.0.0.1:8090/v1/voice-design";
  const EMOTION_DIRECTOR_MODE_CAPTION = "caption";
  const EMOTION_DIRECTOR_MODE_CAPTION_EMOJI = "caption_emoji";
  const EMOTION_DIRECTOR_MODE_CAPTION_EMOJI_TEXT = "caption_emoji_text";
  const TTS_CACHE_MODE_REUSE = "reuse";
  const TTS_CACHE_MODE_REGENERATE = "regenerate";
  const TTS_CACHE_MODES = new Set([TTS_CACHE_MODE_REUSE, TTS_CACHE_MODE_REGENERATE]);
  const CUDA_CACHE_CLEANUP_MODE_OFF = "off";
  const CUDA_CACHE_CLEANUP_MODE_THRESHOLD = "threshold";
  const CUDA_CACHE_CLEANUP_MODE_ALWAYS = "always";
  const CUDA_CACHE_CLEANUP_MODES = new Set([
    CUDA_CACHE_CLEANUP_MODE_OFF,
    CUDA_CACHE_CLEANUP_MODE_THRESHOLD,
    CUDA_CACHE_CLEANUP_MODE_ALWAYS,
  ]);
  const READ_ALL_INSERT_MEMORY_TTL_MS = 60000;
  const READ_ALL_ACTIVATION_AFTER_INSERT_DELAY_MS = 250;
  const READ_ALL_STOP_CLICK_GUARD_MS = 900;
  const READ_ALL_ROOT_DEBUG_LOG_COOLDOWN_MS = 12000;
  const READ_ALL_SCROLL_RESCAN_DELAY_MS = 450;
  const READ_ALL_IGNORED_CLICK_LOG_INTERVAL_MS = 3000;
  const READ_ALL_RETRY_DELAY_FALLBACK_MS = 1500;
  const READ_ALL_RETRY_DELAY_MAX_MS = 10000;
  const PERF_LOG_THRESHOLD_MS = 900;
  const PERF_LOG_COOLDOWN_MS = 5000;
  const DISPLAY_SKIP_LOG_COOLDOWN_MS = 3000;
  const DOM_DECORATION_MAX_VISITED = 180;
  const READ_ALL_DECORATE_STABLE_SKIP_MS = 2500;
  const DISPLAY_RESCAN_DEBOUNCE_MS = 0;
  const DISPLAY_EPOCH_BURST_IDLE_MS = 2200;
  const DISPLAY_HEAVY_BURST_EVENT_COUNT = 10;
  const DISPLAY_HEAVY_RESCAN_DEBOUNCE_MS = 9000;
  const DISPLAY_SCAN_DEFER_EXTRA_MS = 250;
  const BINDING_SETTLE_SCAN_DELAYS_MS = [600, 1600, 4000, 9000, 16000];
  const EVENT_POINT_SPEAKER_SCAN_LIMIT = 100;
  const LONG_MESSAGE_SPEAKER_BUTTON_LIMIT_DEFAULT = 40;
  const LONG_MESSAGE_SPEAKER_BUTTON_LIMIT_MAX = 40;
  const READ_ALL_PREFETCH_AHEAD_DEFAULT = 1;
  const READ_ALL_PREFETCH_AHEAD_MAX = 5;
  const MORE_SPEAKER_BIND_DELAYS_MS = [80, 350, 900, 1800];
  const READ_ALL_BIND_DELAYS_MS = [80, 350, 900, 1800];
  const MORE_SPEAKER_FOLLOWUP_SUPPRESS_MS = 800;
  const MORE_SPEAKER_REVEALED_CLICK_SUPPRESS_MS = 1600;
  const CHAT_ACTIVATION_GATE_MS = 220;
  const CHAT_ACTIVATION_REPEAT_COOLDOWN_MS = 500;
  const CHAT_ACTIVE_BUTTON_STALE_MS = 4500;
  const AUDIO_PRIME_SILENCE_MS = 260;
  const AUDIO_PRIME_PLAY_WAIT_MS = 320;
  const AUDIO_PLAY_START_DELAY_MS = 120;
  const AUTOMATIC_EXISTING_DOM_DECORATION_ENABLED = false;
  const AUTOMATIC_DISPLAY_DOM_RESCAN_ENABLED = false;
  const AUTOMATIC_BINDING_SETTLE_SCANS_ENABLED = false;
  const AUTOMATIC_BINDING_WATCHDOG_ENABLED = false;
  const DECORATED_CONTENT_CACHE_MAX = 80;
  const EMOTION_DIRECTION_CACHE_MAX = 160;
  const DISPLAY_CHARACTER_REFRESH_INTERVAL_MS = 1000;
  const LONG_MESSAGE_BUTTON_LIMIT_THRESHOLD_CHARS = 2500;
  const QUOTED_SEGMENT_MAX_CHARS = 320;
  const NARRATION_LINE_MAX_CHARS = 1000;
  const MAX_VOICE_REFERENCES_PER_REQUEST = 100;
  const BATCH_CAPTION_CONCURRENCY_DEFAULT = 10;
  const BATCH_CAPTION_CONCURRENCY_MAX = 100;
  const VOICE_REFERENCE_SAMPLE_CHARS_DEFAULT = 60;
  const VOICE_REFERENCE_SAMPLE_CHARS_MIN = 20;
  const VOICE_REFERENCE_SAMPLE_CHARS_MAX = 200;
  const MAX_PROMPT_PRESETS = 40;
  const MAX_PROMPT_PRESET_NAME_CHARS = 80;
  const MAX_PROMPT_PRESET_PROMPT_CHARS = 12000;
  const VOICE_COLOR_PRESETS = [
    ["#2563eb", "파랑"],
    ["#0891b2", "청록"],
    ["#16a34a", "초록"],
    ["#ca8a04", "노랑"],
    ["#ea580c", "주황"],
    ["#dc2626", "빨강"],
    ["#db2777", "분홍"],
    ["#9333ea", "보라"],
    ["#4f46e5", "남보라"],
    ["#475569", "회색"],
  ];
  const EMOTION_DIRECTOR_APPLY_MODES = new Set([
    EMOTION_DIRECTOR_MODE_CAPTION,
    EMOTION_DIRECTOR_MODE_CAPTION_EMOJI,
    EMOTION_DIRECTOR_MODE_CAPTION_EMOJI_TEXT,
  ]);
  const IRODORI_EMOJI_ANNOTATIONS = [
    ["👂", "whisper / close to ear"],
    ["😮‍💨", "breath / sigh"],
    ["⏸️", "pause / silence"],
    ["🤭", "chuckle / suppressed laugh"],
    ["🥵", "panting / moan / groan"],
    ["📢", "echo / reverb"],
    ["😏", "teasing / playfully sweet"],
    ["🥺", "trembling / timid"],
    ["🌬️", "heavy breathing"],
    ["😮", "gasp"],
    ["👅", "wet mouth sound"],
    ["💋", "lip noise"],
    ["🫶", "gentle / tender"],
    ["😭", "sobbing / sorrow"],
    ["😱", "scream / shout"],
    ["😪", "sleepy / languid"],
    ["😴", "sleep talking / snoring"],
    ["⏩", "fast speaking"],
    ["📞", "phone / speaker sound"],
    ["🐢", "slowly"],
    ["🥤", "gulp / swallowing"],
    ["🤧", "coughing / sniffling"],
    ["😒", "tutting / displeased"],
    ["😰", "panic / nervous"],
    ["😆", "joyful"],
    ["💥", "forceful"],
    ["😠", "angry / sulking"],
    ["😲", "surprise"],
    ["🥱", "yawn"],
    ["😖", "painful"],
    ["😟", "anxious"],
    ["🫣", "shy / bashful"],
    ["🙄", "exasperated"],
    ["😊", "cheerful"],
    ["😎", "confident"],
    ["👌", "agreement / backchannel"],
    ["🙏", "pleading"],
    ["🥴", "drunken"],
    ["🎵", "humming"],
    ["🤐", "muffled"],
    ["😌", "relieved / content"],
    ["🤔", "questioning"],
    ["💪", "strong / effortful"],
    ["👃", "sniffing / smelling"],
    ["📖", "narration / monologue"],
  ];
  const IRODORI_EMOJI_TOKENS = IRODORI_EMOJI_ANNOTATIONS
    .map(([emoji]) => emoji)
    .sort((a, b) => b.length - a.length);
  const IRODORI_EMOJI_PROMPT = IRODORI_EMOJI_ANNOTATIONS
    .map(([emoji, meaning]) => `${emoji}=${meaning}`)
    .join(", ");
  const DEFAULT_TRANSLATION_PROMPT = [
    "You translate {sourceLanguage} roleplay dialogue into natural Japanese dialogue for TTS.",
    "Preserve character tone, emotion, intimacy, honorific nuance, and names.",
    "Return only the Japanese translation. Do not add explanation.",
  ].join("\n");
  const DEFAULT_EMOTION_DIRECTOR_PROMPT = [
    "You are an acting director for a Japanese roleplay TTS plugin.",
    "Read the surrounding RP context, but do not write literary analysis.",
    "Your job is to convert the scene into a short Japanese acoustic instruction for Irodori-TTS VoiceDesign.",
    "captionJa is sent directly to a Japanese TTS model as a style caption.",
    "captionJa must be Japanese only, one short sentence or at most two short sentences, concrete and audible.",
    "Focus captionJa on voice volume, breath, pitch, pace, tension, distance, articulation, and tone.",
    "Do not write character psychology, plot explanation, relationship analysis, or abstract mood words alone.",
    "Bad captionJa: 彼女は複雑な感情を抱きながら、相手への興味と支配欲を隠して話す。",
    "Good captionJa: 音量を抑えた低めの小声で、息を多めに混ぜ、近い距離からゆっくり囁く。明るくしすぎない。",
    "Keep the base speaker identity aligned with the reference voice. Do not change age, gender, or voice type unless the context clearly requires it.",
    "For whispering or close-to-ear speech, use direct acoustic wording such as 小声, 音量を抑える, 息を多めに, 耳元, 近距離, 声を張らない. Avoid vague wording like 囁くように, 甘く, or 穏やか alone.",
    "For intimate but not whispered speech, describe closeness and softness without making the voice brighter or more cheerful than the context implies.",
    "For crying, fear, anger, or trembling, describe physical voice behavior such as 声が震える, 途切れ途切れ, 息を詰まらせる, 押し殺した声, or 声を荒げる.",
    "If context is ambiguous, keep captionJa restrained and close to neutral.",
  ].join("\n");
  const EMOTION_DIRECTOR_LEADING_EMOJI_PROMPT = `The user selected caption + leading emoji mode. emotionEmoji must be either one exact token from Irodori EMOJI_ANNOTATIONS or an empty string. Allowed tokens: ${IRODORI_EMOJI_PROMPT}. The plugin inserts emotionEmoji near the beginning of the spoken text, so choose it only when it should color the whole line or create a deliberate leading vocal effect. emotionEmoji is optional and should often be empty; captionJa is the main control. If no exact token fits, keep emotionEmoji empty and express the mood in captionJa. Do not use any emoji outside this list. 😒 may be used for clear displeasure, sulking, reluctance, or a dry unimpressed tone, but avoid it for barely perceptible coldness where captionJa alone is enough.`;
  const EMOTION_DIRECTOR_INLINE_EMOJI_PROMPT = `The user selected caption + inline emoji + spokenText edit mode. If an emoji is useful, place one exact token from Irodori EMOJI_ANNOTATIONS directly inside spokenText at the natural timing point, like after laughter, a sigh, cough, pause, sob, or before the phrase whose delivery changes. Allowed tokens: ${IRODORI_EMOJI_PROMPT}. Keep emotionEmoji empty unless one extra whole-line leading vocal effect is truly necessary. If no exact token fits, use no emoji and express the mood in captionJa. Do not use any emoji outside this list. Do not add new spoken words or change meaning; only adjust punctuation, pauses, and allowed emojis. 😒 may be used for clear displeasure, sulking, reluctance, or a dry unimpressed tone. Prefer placing 😒 before or near the phrase that should sound displeased, not at the very end unless a trailing tut or extra displeased aftertone is intended.`;
  const DEFAULT_LOREBOOK_SCAN_PROMPT = [
    "You identify distinct RP characters from a RisuAI character sheet and lorebook entries.",
    "Include only recurring supporting characters, alternate speakers, or NPCs that plausibly need their own TTS voice.",
    "A valid character should have a profile block, role, personality, speaking style, voice hint, age/gender impression, or enough behavior description to speak in RP.",
    "Exclude one-off mentions, relatives or names mentioned only in backstory, places, organizations, items, factions, concepts, aliases without a profile, and setting-only entries.",
    "Never output profile field labels or section headings as characters, such as Affiliation, Birth Year, Breathing Style, Combat Technique, Features, Personality, Profile, Age, Gender, Status, or Voice.",
    "Exclude the current main bot character unless the lorebook clearly describes another separate persona with the same name.",
    "If uncertain, omit the name. Precision is more important than recall.",
    "Use the original display name exactly as it appears in the lorebook. If both Hangul and kanji/kana appear for one character, put the display name as Hangul(kanji/kana), for example 탄지로(炭治郎), and include each separate spelling in aliases.",
    "Aliases are used to match live RP speaker labels. Include only likely speaker labels such as Makima, 마키마, マキマ, Denji, 덴지, デンジ when those variants are obvious for the same character.",
    "If both a Korean/Japanese name and a romanized English name appear, put the Korean/Japanese name in name and put romanized names in aliases.",
    "Do not invent extra romanized aliases when a romanized name already appears in the lorebook.",
    "Do not include age/status descriptors or partial labels as aliases, such as kid, adult, child, young, old, male, female, Veru(kid), or Veru(adult), unless the exact label is explicitly used as a live speaker name.",
    "Prefer Hangul, kana, kanji, or mixed CJK display names over romanized English names whenever both refer to the same character.",
    "Do not invent unrelated character names.",
  ].join("\n");
  const PREVIEW_TEXT = "こんにちは。きょうは、あなたにあえてうれしいです。";
  const LOG_LIMIT = 160;
  const GLOBAL_BOT_ID = "risutts:global";
  const GLOBAL_BOT_NAME = "글로벌";
  const GLOBAL_NARRATOR_FOLDER_ID = "risutts:global:folder:narrator";
  const GLOBAL_NARRATOR_FOLDER_NAME = "나레이터 폴더";
  const GLOBAL_CHARACTER_FOLDER_ID = "risutts:global:folder:characters";
  const GLOBAL_CHARACTER_FOLDER_NAME = "글로벌 캐릭터 폴더";
  const GLOBAL_NARRATION_ID = "risutts:global:narrator";
  const GLOBAL_NARRATION_NAME = "나레이터_지문";
  const GLOBAL_MALE_ID = "risutts:global:male";
  const GLOBAL_MALE_NAME = "글로벌_남성";
  const GLOBAL_FEMALE_ID = "risutts:global:female";
  const GLOBAL_FEMALE_NAME = "글로벌_여성";
  const METADATA_PROFILE_OPTIONS = [
    ["common", "공통"],
    ["preset1", "프리셋 1"],
    ["preset2", "프리셋 2"],
    ["preset3", "프리셋 3"],
  ];
  const METADATA_PROFILE_IDS = new Set(METADATA_PROFILE_OPTIONS.map(([id]) => id));
  const LOREBOOK_SCAN_MAX_ENTRIES = 3000;
  const LOREBOOK_SCAN_MAX_WALK_ENTRIES = 4800;
  const LOREBOOK_SCAN_MAX_ARRAY_ITEMS = 10000;
  const LOREBOOK_SCAN_MAX_CHARACTERS = 1600;
  const LOREBOOK_SCAN_PROMPT_CHARS = 1000000;
  const LOREBOOK_SCAN_ENTRY_CHARS = 16000;
  const LOREBOOK_SCAN_BATCH_CHARS = 240000;
  const CAPTION_PROMPT_CHARS = 24000;
  const CAPTION_LOREBOOK_ENTRY_CHARS = 900;
  const CAPTION_MIN_LOREBOOK_ENTRIES = 6;
  const CAPTION_COMPACT_LOREBOOK_ENTRY_CHARS = 360;
  const DELETE_BOT_CONFIRM_TEXT = "삭제합니다.";
  const READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP = "message_top";
  const CSS_PROPERTY_NAME_PATTERN = /^(?:accent-color|align-content|align-items|align-self|animation|appearance|backdrop-filter|background|background-color|background-image|background-position|background-size|border|border-color|border-radius|border-style|border-width|bottom|box-shadow|box-sizing|color|column-gap|content|cursor|display|filter|flex|flex-basis|flex-direction|flex-flow|flex-grow|flex-shrink|flex-wrap|font|font-family|font-size|font-style|font-weight|gap|grid|grid-area|grid-column|grid-row|grid-template|grid-template-columns|grid-template-rows|height|inset|justify-content|justify-items|left|letter-spacing|line-height|margin|margin-bottom|margin-left|margin-right|margin-top|max-height|max-width|min-height|min-width|object-fit|opacity|outline|overflow|overflow-x|overflow-y|padding|padding-bottom|padding-left|padding-right|padding-top|pointer-events|position|right|row-gap|text-align|text-decoration|text-shadow|text-transform|top|transform|transition|user-select|vertical-align|visibility|white-space|width|z-index)$/i;

  const BLOCKED_LORE_CHARACTER_NAMES = new Set([
    "affiliation",
    "age",
    "aliases",
    "appearance",
    "background",
    "birth date",
    "birth year",
    "blood demon art",
    "breathing style",
    "character",
    "combat style",
    "combat technique",
    "description",
    "dialogue",
    "entry",
    "family",
    "features",
    "gender",
    "height",
    "history",
    "lorebook",
    "name",
    "occupation",
    "personality",
    "profile",
    "race",
    "rank",
    "relationships",
    "role",
    "scenario",
    "setting",
    "speaker",
    "species",
    "status",
    "summary",
    "technique",
    "title",
    "voice",
    "voice hints",
    "voice type",
    "weapon",
    "weight",
  ]);
  const GENERIC_LORE_ALIAS_KEYS = new Set([
    "adult",
    "boy",
    "child",
    "children",
    "female",
    "girl",
    "kid",
    "male",
    "man",
    "middle aged",
    "old",
    "older",
    "senior",
    "teen",
    "teenager",
    "woman",
    "young",
    "younger",
    "아이",
    "어른",
    "성인",
    "어린",
    "어린이",
    "소년",
    "소녀",
    "남자",
    "여자",
    "子供",
    "大人",
    "少年",
    "少女",
    "青年",
    "男性",
    "女性",
    "幼少期",
  ]);

  const DEFAULT_CONFIG = {
    storageSchemaVersion: PLUGIN_STORAGE_SCHEMA_VERSION,
    serverUrl: "http://127.0.0.1:8088",
    ttsModel: "irodori-tts",
    metadataProfileId: "common",
    metadataProfileSyncId: "",
    responseFormat: "wav",
    defaultVoice: "none",
    ttsApiKey: "",
    numSteps: 32,
    cfgScaleText: 3,
    cfgScaleSpeaker: 7,
    cfgScaleCaption: 5,
    speed: 1,
    chunkMinChars: 200,
    longMessageSpeakerButtonLimit: LONG_MESSAGE_SPEAKER_BUTTON_LIMIT_DEFAULT,
    batchCaptionConcurrency: BATCH_CAPTION_CONCURRENCY_DEFAULT,
    readAllPrefetchAhead: READ_ALL_PREFETCH_AHEAD_DEFAULT,
    ttsCacheMode: TTS_CACHE_MODE_REUSE,
    cudaCacheCleanupMode: CUDA_CACHE_CLEANUP_MODE_OFF,
    autoStopOnContextChange: true,
    referenceVolumeNormalize: false,
    readAllButtonEnabled: true,
    koreanTranslateTts: false,
    translationPrompt: DEFAULT_TRANSLATION_PROMPT,
    translationPromptPresets: [],
    translationModel: "",
    translationEndpoint: "",
    translationApiKey: "",
    translationMethod: "llm",
    emotionDirectorEnabled: false,
    emotionDirectorPrompt: DEFAULT_EMOTION_DIRECTOR_PROMPT,
    emotionDirectorPromptPresets: [],
    emotionDirectorManualCaption: "",
    debugTtsSeed: "",
    emotionDirectorModel: "",
    emotionDirectorEndpoint: "",
    emotionDirectorApiKey: "",
    emotionDirectorContextBefore: 2,
    emotionDirectorContextAfter: 1,
    emotionDirectorContinueOnError: true,
    emotionDirectorCacheEnabled: true,
    emotionDirectorApplyMode: EMOTION_DIRECTOR_MODE_CAPTION_EMOJI,
    captionModelSource: "aux",
    lorebookScanPrompt: DEFAULT_LOREBOOK_SCAN_PROMPT,
    captionModel: "",
    captionEndpoint: "",
    captionApiKey: "",
    ttsModelEndpoint: DEFAULT_TTS_MODEL_ENDPOINT,
    voiceDesignCharacterLine: true,
    voiceDesignEmotionEmoji: true,
    voiceReferenceCount: 3,
    voiceReferenceSampleChars: VOICE_REFERENCE_SAMPLE_CHARS_DEFAULT,
    voiceDesignGuidance: "",
    voiceDesignResearchUrls: "",
    voiceDesignResearchNotes: "",
    globalNarrationEnabled: false,
    voiceByCharacter: {},
    hiddenBotIds: [],
    hiddenBotNames: {},
  };

  let storage = null;
  let config = { ...DEFAULT_CONFIG };
  let rootDoc = null;
  let domBindingStarted = false;
  let delegatedDomBindingStarted = false;
  let bindScheduled = false;
  let bindScheduleTimer = null;
  let displayRescanTimer = null;
  let displayEpochBurstTimer = null;
  let displayEpochBurstActive = false;
  let displayEpochBurstEvents = 0;
  let displayMutationQuietUntil = 0;
  const speakerClickEventTokens = new Map();
  let lastAutomaticScanDeferLogAt = 0;
  let scrollRescanTimer = null;
  let bindWatchdogTimer = null;
  let bindWatchdogRunsLeft = 0;
  let bindWatchdogRunning = false;
  const bindingSettleScanTimers = new Set();
  const moreSpeakerBindTimers = new Set();
  let moreSpeakerBindScheduledEpoch = null;
  let moreSpeakerBindScheduleRequests = 0;
  const readAllBindTimers = new Set();
  let readAllBindScheduledEpoch = null;
  let readAllBindScheduleRequests = 0;
  let domMutationObserver = null;
  let runtimeDisposed = false;
  let domScanEpoch = 0;
  let currentAudio = null;
  let currentAudioKey = "";
  let currentAudioPayloadId = "";
  let currentAudioOwnerBotId = "";
  let activePlaybackOwnerBotId = "";
  let currentAudioDispose = null;
  let currentAudioReset = null;
  let activeReadAllSequenceId = 0;
  let activeReadAllContentHash = "";
  let activeReadAllOwnerBotId = "";
  let activeReadAllStopAllowedAt = 0;
  let lastMainDomEventPoint = null;
  let lastMoreSpeakersEventPoint = null;
  let lastMoreSpeakersReveal = null;
  let noChatButtonAudioScanCount = 0;
  let lastKnownCharacterId = "global";
  let voiceContextSnapshot = { characterId: "", chatIndex: "", ts: 0, character: null };
  const VOICE_CONTEXT_SNAPSHOT_TTL_MS = 2000;
  function invalidateVoiceContextSnapshot() {
    voiceContextSnapshot = { characterId: "", chatIndex: "", ts: 0, character: null };
  }
  let overlayGenerationInFlight = false;
  let overlayGenerationToken = 0;
  let chatTtsPrepareInFlight = false;
  let chatTtsPrepareToken = 0;
  let chatTtsPrepareLockedUntil = 0;
  const CHAT_TTS_PREPARE_LOCK_MS = 2000;
  let ttsGenerationInFlight = false;
  let pendingManualTtsClick = null;
  let _ttsMutexReady = true;
  const _ttsMutexWaiters = [];
  function acquireTtsMutex() {
    return new Promise((resolve) => {
      if (_ttsMutexReady) {
        _ttsMutexReady = false;
        resolve();
      } else {
        _ttsMutexWaiters.push(resolve);
      }
    });
  }
  function releaseTtsMutex() {
    if (_ttsMutexWaiters.length > 0) {
      const next = _ttsMutexWaiters.shift();
      next();
    } else {
      _ttsMutexReady = true;
    }
  }
  function firePendingManualClick() {
    if (!pendingManualTtsClick) return;
    const next = pendingManualTtsClick;
    pendingManualTtsClick = null;
    addRuntimeLog("TTS 대기 중이던 클릭 실행", { payloadId: next.payloadId });
    try {
      handleButtonClick(next.button, next.payloadId, next.options).catch((err) => {
        addRuntimeLog("TTS 대기 클릭 실행 실패", { payloadId: next.payloadId, error: describeError(err) });
      });
    } catch (err) {
      addRuntimeLog("TTS 대기 클릭 실행 동기 예외", { payloadId: next.payloadId, error: describeError(err) });
    }
  }
  const parsedSegmentsCache = new Map();
  const PARSED_SEGMENTS_CACHE_MAX = 40;
  const speakableCheckCache = new Map();
  const SPEAKABLE_CHECK_CACHE_MAX = 80;
  const overlayChildIndex = new Map();
  let overlayButtonPlaceCache = { ts: 0, sig: "", map: new Map() };
  const OVERLAY_BUTTON_PLACE_TTL_MS = 250;
  const speakerMatchCacheByBot = new Map();
  const SPEAKER_MATCH_CACHE_TTL_MS = 5000;
  const buttonRingTimers = new Map();
  const activeChatButtonStates = new Map();
  let lastEventFilterWarningAt = 0;
  let lastChatButtonEventStatus = "";
  let lastButtonScanStatus = "";
  let lastDisplayCharacterRefreshAt = 0;
  let lastReadAllDecorateDebugAt = 0;
  let lastAutoDecorateExistingAt = 0;
  let lastReadAllDecorateAt = 0;
  let lastReadAllDecorateButtonKey = "";
  let readAllIgnoredClickLogAt = 0;
  let readAllIgnoredClickCount = 0;
  let explorerDragWheelCleanup = null;
  const runtimeLogs = [];
  let decorateContentRunSeq = 0;
  let lastDecorateContentSummary = null;
  let lastDecorateSkipSummary = null;
  let lastDecorateSkipLogAt = 0;
  let lastDecorateSkipLogKey = "";
  let lastDomBindingStatus = {
    found: 0,
    bound: 0,
    skipped: 0,
    errors: [],
  };
  let lastDomBindingWatchdogStatus = {
    active: false,
    runsLeft: 0,
    attempts: 0,
    reason: "",
  };
  let lastDomDecorationStatus = {
    scanned: 0,
    decorated: 0,
    errors: [],
  };

  const payloads = new Map();
  const contentSegmentsByHash = new Map();
  const readAllPayloadsByHash = new Map();
  const decoratedContentCache = new Map();
  const audioCache = new Map();
  const activationTimes = new Map();
  const readAllActivationTimes = new Map();
  const readAllInsertLocks = new Set();
  const readAllRecentInsertTimes = new Map();
  const readAllRootDebugLogTimes = new Map();
  const readAllDirectEventTimes = new Map();
  const readAllIgnoredClickSamples = new Map();
  const moreSpeakerEventTimes = new Map();
  const performanceLogTimes = new Map();
  let readAllMessageRootSeq = 0;
  let readAllDecorateRunning = false;
  let readAllDecoratePending = false;
  let chatActivationGatePayloadId = "";
  let chatActivationGateUntil = 0;
  let latestChatPlaybackRequestId = 0;
  let lastAudioPrimeAt = 0;
  let decoratedContentCacheHitCount = 0;
  let lastDecoratedContentCacheHitLogAt = 0;
  let translationCache = {};
  const emotionDirectionCache = new Map();
  let voiceReferencesByCharacter = {};
  let unregisteredVoiceFilesForExplorer = [];
  let unregisteredReferencesOpen = false;
  let lastTtsRequestDebug = null;
  let sharedVoiceMetadataPersistTimer = null;
  let sharedVoiceMetadataPersistAllowEmpty = false;
  let sharedVoiceMetadataWriteEnabled = false;
  let sharedVoiceMetadataLoadedProfileId = "";

  function currentRuntimeRecord() {
    try {
      return globalThis[RUNTIME_SINGLETON_KEY] || null;
    } catch {
      return null;
    }
  }

  function isCurrentRuntimeInstance() {
    return !runtimeDisposed && currentRuntimeRecord()?.id === RUNTIME_INSTANCE_ID;
  }

  function disposeRuntime(reason = "superseded") {
    runtimeDisposed = true;
    if (bindScheduleTimer) {
      clearTimeout(bindScheduleTimer);
      bindScheduleTimer = null;
    }
    if (displayRescanTimer) {
      clearTimeout(displayRescanTimer);
      displayRescanTimer = null;
    }
    if (displayEpochBurstTimer) {
      clearTimeout(displayEpochBurstTimer);
      displayEpochBurstTimer = null;
    }
    speakerClickEventTokens.clear();
    readAllDirectEventTimes.clear();
    moreSpeakerEventTimes.clear();
    for (const timer of moreSpeakerBindTimers) {
      clearTimeout(timer);
    }
    moreSpeakerBindTimers.clear();
    moreSpeakerBindScheduledEpoch = null;
    moreSpeakerBindScheduleRequests = 0;
    for (const timer of readAllBindTimers) {
      clearTimeout(timer);
    }
    readAllBindTimers.clear();
    readAllBindScheduledEpoch = null;
    readAllBindScheduleRequests = 0;
    displayEpochBurstActive = false;
    displayEpochBurstEvents = 0;
    displayMutationQuietUntil = 0;
    overlayGenerationInFlight = false;
    overlayGenerationToken = 0;
    chatTtsPrepareInFlight = false;
    chatTtsPrepareToken = 0;
    chatTtsPrepareLockedUntil = 0;
    ttsGenerationInFlight = false;
    pendingManualTtsClick = null;
    _ttsMutexReady = true;
    _ttsMutexWaiters.length = 0;
    invalidateVoiceContextSnapshot();
    if (typeof parsedSegmentsCache !== "undefined" && parsedSegmentsCache) parsedSegmentsCache.clear();
    if (typeof speakableCheckCache !== "undefined" && speakableCheckCache) speakableCheckCache.clear();
    if (typeof speakerMatchCacheByBot !== "undefined" && speakerMatchCacheByBot) speakerMatchCacheByBot.clear();
    overlayButtonPlaceCache = { ts: 0, sig: "", map: new Map() };
    if (scrollRescanTimer) {
      clearTimeout(scrollRescanTimer);
      scrollRescanTimer = null;
    }
    if (typeof overlayStreamTimer !== "undefined" && overlayStreamTimer) {
      clearInterval(overlayStreamTimer);
      overlayStreamTimer = null;
    }
    if (typeof overlayCacheTickTimer !== "undefined" && overlayCacheTickTimer) {
      clearInterval(overlayCacheTickTimer);
      overlayCacheTickTimer = null;
    }
    try {
      if (domMutationObserver && typeof domMutationObserver.disconnect === "function") {
        domMutationObserver.disconnect();
      }
    } catch {
      // Mutation observer cleanup is best-effort.
    }
    domMutationObserver = null;
    domBindingStarted = false;
    delegatedDomBindingStarted = false;
    console.log(`[RisuTTS] Runtime disposed: ${reason}`);
  }

  function installRuntimeSingleton() {
    const previous = currentRuntimeRecord();
    if (previous && previous.id !== RUNTIME_INSTANCE_ID && typeof previous.dispose === "function") {
      try {
        previous.dispose(`superseded-by-${PLUGIN_VERSION}`);
      } catch (error) {
        console.log(`[RisuTTS] Previous runtime dispose failed: ${describeError(error)}`);
      }
    }
    runtimeDisposed = false;
    globalThis[RUNTIME_SINGLETON_KEY] = {
      id: RUNTIME_INSTANCE_ID,
      version: PLUGIN_VERSION,
      dispose: disposeRuntime,
    };
  }

  async function getStorage() {
    if (!storage) {
      storage = await api.getLocalPluginStorage();
    }
    return storage;
  }

  async function loadConfig() {
    const store = await getStorage();
    const saved = await store.getItem(CONFIG_KEY);
    config = normalizeConfig({ ...DEFAULT_CONFIG, ...(saved || {}) });
    translationCache = (await store.getItem(TRANSLATION_CACHE_KEY)) || {};
    const storedVoiceReferences = (await store.getItem(VOICE_REFERENCES_KEY)) || {};
    voiceReferencesByCharacter = normalizeVoiceReferencesMap({
      voiceReferencesByCharacter: storedVoiceReferences,
    });
    sharedVoiceMetadataWriteEnabled = false;
    sharedVoiceMetadataLoadedProfileId = "";
    schedulePersistSharedVoiceMetadata();
    const syncProfileId = String(config.metadataProfileSyncId || "").trim()
      ? normalizeMetadataProfileId(config.metadataProfileSyncId)
      : "";
    if (syncProfileId && syncProfileId === currentMetadataProfileId()) {
      sharedVoiceMetadataWriteEnabled = true;
      sharedVoiceMetadataLoadedProfileId = syncProfileId;
    }
    clearDecoratedContentCache();
    return config;
  }

  async function saveConfig(nextConfig) {
    config = normalizeConfig({ ...config, ...nextConfig });
    clearDecoratedContentCache();
    const store = await getStorage();
    await store.setItem(CONFIG_KEY, config);
    schedulePersistSharedVoiceMetadata();
    return config;
  }

  async function saveTranslationCache() {
    const keys = Object.keys(translationCache);
    if (keys.length > 200) {
      const trimmed = {};
      for (const key of keys.slice(keys.length - 200)) {
        trimmed[key] = translationCache[key];
      }
      translationCache = trimmed;
    }
    const store = await getStorage();
    await store.setItem(TRANSLATION_CACHE_KEY, translationCache);
  }

  async function saveVoiceReferences() {
    const store = await getStorage();
    const sanitized = sanitizedVoiceReferencesForStorage();
    await store.setItem(VOICE_REFERENCES_KEY, sanitized);
    clearDecoratedContentCache();
    schedulePersistSharedVoiceMetadata({ allowEmpty: true });
  }

  function sanitizedVoiceReferencesForStorage() {
    const sanitized = JSON.parse(JSON.stringify(voiceReferencesByCharacter || {}));
    for (const [characterId, referenceSet] of Object.entries(sanitized)) {
      sanitized[characterId] = normalizeReferenceSetFields(referenceSet);
      for (const reference of referenceItems(sanitized[characterId])) {
        delete reference.fileMissing;
      }
    }
    return sanitized;
  }

  function normalizeMetadataProfileId(value) {
    const id = String(value || "").trim().toLowerCase();
    return METADATA_PROFILE_IDS.has(id) ? id : "common";
  }

  function isMetadataProfileId(value) {
    return METADATA_PROFILE_IDS.has(String(value || "").trim().toLowerCase());
  }

  function metadataProfileLabel(profileId) {
    const id = normalizeMetadataProfileId(profileId);
    return METADATA_PROFILE_OPTIONS.find(([value]) => value === id)?.[1] || "공통";
  }

  function metadataProfileLabelWithParticle(profileId) {
    const label = metadataProfileLabel(profileId);
    return label === "공통" ? "공통으로" : `${label}로`;
  }

  function currentMetadataProfileId() {
    return normalizeMetadataProfileId(config.metadataProfileId);
  }

  function currentExplorerProfilePayload(updatedAt = new Date().toISOString()) {
    return {
      version: SHARED_VOICE_PROFILE_VERSION,
      schemaVersion: SHARED_VOICE_METADATA_SCHEMA_VERSION,
      profileId: currentMetadataProfileId(),
      label: metadataProfileLabel(config.metadataProfileId),
      pluginVersion: PLUGIN_VERSION,
      updatedAt,
      voiceReferencesByCharacter: sanitizedVoiceReferencesForStorage(),
      explorerConfig: {
        voiceByCharacter: { ...(config.voiceByCharacter || {}) },
        hiddenBotIds: Array.isArray(config.hiddenBotIds) ? [...config.hiddenBotIds] : [],
        hiddenBotNames: { ...(config.hiddenBotNames || {}) },
        globalNarrationEnabled: Boolean(config.globalNarrationEnabled),
      },
    };
  }

  function voiceReferencesField(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return {};
    const references = source.voiceReferencesByCharacter;
    if (references && typeof references === "object" && !Array.isArray(references)) return references;
    return {};
  }

  function referenceItems(referenceSet) {
    if (!referenceSet || typeof referenceSet !== "object" || Array.isArray(referenceSet)) return [];
    if (Array.isArray(referenceSet.references)) return referenceSet.references;
    return [];
  }

  function normalizeReferenceSetFields(referenceSet) {
    if (!referenceSet || typeof referenceSet !== "object" || Array.isArray(referenceSet)) return referenceSet;
    const normalized = {
      ...referenceSet,
      references: referenceItems(referenceSet),
    };
    return normalized;
  }

  function normalizeVoiceReferencesMap(source) {
    const normalized = {};
    const references = voiceReferencesField(source);
    for (const [characterId, referenceSet] of Object.entries(references || {})) {
      normalized[characterId] = normalizeReferenceSetFields(referenceSet);
    }
    return normalized;
  }

  function normalizeSharedVoiceMetadataForRead(metadata) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    if (metadata.profiles && typeof metadata.profiles === "object" && !Array.isArray(metadata.profiles)) {
      return {
        ...metadata,
        app: metadata.app || SHARED_VOICE_METADATA_APP,
        version: Number(metadata.version || 0) || SHARED_VOICE_METADATA_VERSION,
        schemaVersion: Number(metadata.schemaVersion || 0) || SHARED_VOICE_METADATA_SCHEMA_VERSION,
        activeProfileId: normalizeMetadataProfileId(metadata.activeProfileId || "common"),
      };
    }
    return null;
  }

  function sharedMetadataProfiles(metadata) {
    const normalized = normalizeSharedVoiceMetadataForRead(metadata);
    const profiles = {};
    if (normalized?.profiles && typeof normalized.profiles === "object" && !Array.isArray(normalized.profiles)) {
      for (const [profileId, profile] of Object.entries(normalized.profiles)) {
        const safeId = String(profileId || "").trim().toLowerCase();
        if (!isMetadataProfileId(safeId)) continue;
        if (!safeId || !profile || typeof profile !== "object" || Array.isArray(profile)) continue;
        const normalizedProfile = {
          ...profile,
          version: Number(profile.version || 0) || SHARED_VOICE_PROFILE_VERSION,
          schemaVersion: Number(profile.schemaVersion || 0) || SHARED_VOICE_METADATA_SCHEMA_VERSION,
          profileId: profile.profileId || safeId,
          label: profile.label || metadataProfileLabel(safeId),
          voiceReferencesByCharacter: normalizeVoiceReferencesMap(profile),
        };
        profiles[safeId] = JSON.parse(JSON.stringify(normalizedProfile));
      }
    }
    return profiles;
  }

  function sharedProfileFromMetadata(metadata, profileId = currentMetadataProfileId()) {
    const profiles = sharedMetadataProfiles(metadata);
    const safeId = normalizeMetadataProfileId(profileId);
    return profiles[safeId] || null;
  }

  function voiceUsageInSharedMetadata(metadata, voiceIds) {
    const targets = new Set((Array.isArray(voiceIds) ? voiceIds : [])
      .map((voiceId) => String(voiceId || "").trim())
      .filter(Boolean));
    if (!targets.size) return [];
    const usages = [];
    const profiles = sharedMetadataProfiles(metadata);
    for (const [profileId, profile] of Object.entries(profiles)) {
      const label = profile?.label || metadataProfileLabel(profileId);
      const referenceSets = normalizeVoiceReferencesMap(profile);
      if (referenceSets && typeof referenceSets === "object" && !Array.isArray(referenceSets)) {
        for (const referenceSet of Object.values(referenceSets)) {
          const characterName = referenceSet?.characterName || referenceSet?.characterId || "이름 없는 캐릭터";
          for (const reference of referenceItems(referenceSet)) {
            const voiceId = String(reference?.voiceId || "").trim();
            if (targets.has(voiceId)) {
              usages.push({ profileId, profileLabel: label, characterName, voiceId });
            }
          }
        }
      }
      const selectedVoices = profile?.explorerConfig?.voiceByCharacter || {};
      if (selectedVoices && typeof selectedVoices === "object" && !Array.isArray(selectedVoices)) {
        for (const voiceId of Object.values(selectedVoices)) {
          const safeVoiceId = String(voiceId || "").trim();
          if (targets.has(safeVoiceId)) {
            usages.push({ profileId, profileLabel: label, characterName: "선택 보이스 기록", voiceId: safeVoiceId });
          }
        }
      }
    }
    return usages;
  }

  function sharedVoiceMetadataPayload(baseMetadata = null) {
    const updatedAt = new Date().toISOString();
    const profileId = currentMetadataProfileId();
    const profiles = sharedMetadataProfiles(baseMetadata);
    profiles[profileId] = currentExplorerProfilePayload(updatedAt);
    return {
      app: SHARED_VOICE_METADATA_APP,
      version: SHARED_VOICE_METADATA_VERSION,
      schemaVersion: SHARED_VOICE_METADATA_SCHEMA_VERSION,
      pluginVersion: PLUGIN_VERSION,
      updatedAt,
      activeProfileId: profileId,
      profiles,
    };
  }

  function mergeMissingObjectKeys(target, source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return false;
    let changed = false;
    for (const [key, value] of Object.entries(source)) {
      if (!key || target[key] != null) continue;
      target[key] = value;
      changed = true;
    }
    return changed;
  }

  function mergeSharedVoiceMetadata(metadata) {
    if (!metadata || typeof metadata !== "object") return false;
    let changed = false;
    const importedReferences = normalizeVoiceReferencesMap(metadata);
    if (importedReferences && typeof importedReferences === "object" && !Array.isArray(importedReferences)) {
      for (const [characterId, referenceSet] of Object.entries(importedReferences)) {
        if (!characterId || !referenceSet || typeof referenceSet !== "object" || Array.isArray(referenceSet)) continue;
        const before = JSON.stringify(voiceReferencesByCharacter[characterId] || null);
        voiceReferencesByCharacter[characterId] = mergeVoiceReferenceSet(
          voiceReferencesByCharacter[characterId] || null,
          referenceSet,
        );
        if (before !== JSON.stringify(voiceReferencesByCharacter[characterId] || null)) {
          changed = true;
        }
      }
    }

    const explorerConfig = metadata.explorerConfig && typeof metadata.explorerConfig === "object"
      ? metadata.explorerConfig
      : {};
    const nextVoiceByCharacter = { ...(config.voiceByCharacter || {}) };
    if (mergeMissingObjectKeys(nextVoiceByCharacter, explorerConfig.voiceByCharacter)) {
      config.voiceByCharacter = nextVoiceByCharacter;
      changed = true;
    }

    const hiddenBotIds = new Set(Array.isArray(config.hiddenBotIds) ? config.hiddenBotIds : []);
    for (const id of Array.isArray(explorerConfig.hiddenBotIds) ? explorerConfig.hiddenBotIds : []) {
      const safeId = String(id || "").trim();
      if (!safeId || hiddenBotIds.has(safeId)) continue;
      hiddenBotIds.add(safeId);
      changed = true;
    }
    config.hiddenBotIds = Array.from(hiddenBotIds);

    const nextHiddenBotNames = { ...(config.hiddenBotNames || {}) };
    if (mergeMissingObjectKeys(nextHiddenBotNames, explorerConfig.hiddenBotNames)) {
      config.hiddenBotNames = nextHiddenBotNames;
      changed = true;
    }

    if (explorerConfig.globalNarrationEnabled === true && config.globalNarrationEnabled !== true) {
      config.globalNarrationEnabled = true;
      changed = true;
    }
    if (changed) {
      config = normalizeConfig(config);
    }
    return changed;
  }

  function hasLocalVoiceExplorerData() {
    return Object.keys(voiceReferencesByCharacter || {}).length > 0
      || Object.keys(config.voiceByCharacter || {}).length > 0
      || Boolean(config.globalNarrationEnabled);
  }

  async function loadSharedVoiceMetadataFromHelper(store) {
    if (hasLocalVoiceExplorerData()) return false;
    const metadata = await requestHelperVoiceMetadata();
    if (!metadata) return false;
    const changed = replaceVoiceExplorerWithSharedMetadata(metadata);
    if (!changed) return false;
    await store.setItem(CONFIG_KEY, config);
    await store.setItem(VOICE_REFERENCES_KEY, sanitizedVoiceReferencesForStorage());
    addRuntimeLog("보이스 메타데이터 가져오기", {
      source: "voices/.risutts-voice-metadata.json",
      references: registeredVoiceIds().size,
    });
    return true;
  }

  function replaceVoiceExplorerWithSharedMetadata(metadata) {
    if (!metadata || typeof metadata !== "object") return false;
    const profileId = currentMetadataProfileId();
    const profile = sharedProfileFromMetadata(metadata, profileId) || {
      voiceReferencesByCharacter: {},
      explorerConfig: {},
    };
    const importedReferences = normalizeVoiceReferencesMap(profile);
    const nextReferences = {};
    if (importedReferences && typeof importedReferences === "object" && !Array.isArray(importedReferences)) {
      for (const [characterId, referenceSet] of Object.entries(importedReferences)) {
        if (!characterId || !referenceSet || typeof referenceSet !== "object" || Array.isArray(referenceSet)) continue;
        const normalizedSet = mergeVoiceReferenceSet(null, {
          ...referenceSet,
          characterId: referenceSet.characterId || characterId,
        });
        if (normalizedSet?.characterId) {
          nextReferences[normalizedSet.characterId] = normalizedSet;
        }
      }
    }

    const explorerConfig = profile.explorerConfig && typeof profile.explorerConfig === "object"
      ? profile.explorerConfig
      : {};
    voiceReferencesByCharacter = nextReferences;
    config = normalizeConfig({
      ...config,
      metadataProfileId: profileId,
      voiceByCharacter: explorerConfig.voiceByCharacter && typeof explorerConfig.voiceByCharacter === "object"
        ? explorerConfig.voiceByCharacter
        : {},
      hiddenBotIds: Array.isArray(explorerConfig.hiddenBotIds) ? explorerConfig.hiddenBotIds : [],
      hiddenBotNames: explorerConfig.hiddenBotNames && typeof explorerConfig.hiddenBotNames === "object"
        ? explorerConfig.hiddenBotNames
        : {},
      globalNarrationEnabled: Boolean(explorerConfig.globalNarrationEnabled),
    });
    return true;
  }

  function schedulePersistSharedVoiceMetadata(options = {}) {
    if (!sharedVoiceMetadataWriteEnabled) return;
    if (currentMetadataProfileId() !== sharedVoiceMetadataLoadedProfileId) return;
    const allowEmpty = Boolean(options.allowEmpty);
    if (!allowEmpty && !hasLocalVoiceExplorerData()) return;
    sharedVoiceMetadataPersistAllowEmpty = sharedVoiceMetadataPersistAllowEmpty || allowEmpty;
    if (sharedVoiceMetadataPersistTimer) {
      globalThis.clearTimeout(sharedVoiceMetadataPersistTimer);
    }
    sharedVoiceMetadataPersistTimer = globalThis.setTimeout(() => {
      sharedVoiceMetadataPersistTimer = null;
      const persistOptions = { allowEmpty: sharedVoiceMetadataPersistAllowEmpty };
      sharedVoiceMetadataPersistAllowEmpty = false;
      persistSharedVoiceMetadata(persistOptions).catch(() => {});
    }, 250);
  }

  async function persistSharedVoiceMetadata(options = {}) {
    const force = Boolean(options.force);
    if (!force && !sharedVoiceMetadataWriteEnabled) return false;
    if (!force && currentMetadataProfileId() !== sharedVoiceMetadataLoadedProfileId) return false;
    if (!options.allowEmpty && !hasLocalVoiceExplorerData()) return false;
    const url = helperVoiceMetadataUrl();
    if (!url) return false;
    const baseMetadata = await requestHelperVoiceMetadata().catch(() => null);
    const body = JSON.stringify({ metadata: sharedVoiceMetadataPayload(baseMetadata) });
    const attempts = [
      {
        label: "browser POST",
        run: async () => fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }),
      },
      {
        label: "native POST(no interceptor)",
        run: async () => api.nativeFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          interceptor: false,
        }),
      },
      {
        label: "native POST",
        run: async () => api.nativeFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }),
      },
    ];
    for (const attempt of attempts) {
      try {
        const response = await attempt.run();
        if (!response.ok) continue;
        return true;
      } catch {
        // Helper may be closed; local plugin storage remains authoritative.
      }
    }
    return false;
  }

  function withoutHiddenBot(botId, hiddenIds = config.hiddenBotIds, hiddenNames = config.hiddenBotNames) {
    const safeBotId = String(botId || "").trim();
    const nextHiddenBotIds = Array.isArray(hiddenIds)
      ? hiddenIds.filter((id) => id !== safeBotId)
      : [];
    const nextHiddenBotNames = { ...(hiddenNames || {}) };
    if (safeBotId) delete nextHiddenBotNames[safeBotId];
    return { hiddenBotIds: nextHiddenBotIds, hiddenBotNames: nextHiddenBotNames };
  }

  function normalizeConfig(input) {
    const next = { ...DEFAULT_CONFIG, ...(input || {}) };
    const inputSchemaVersion = Number(input?.storageSchemaVersion || 0) || 0;
    if (inputSchemaVersion < 2 && Number(input?.cfgScaleSpeaker) === 5) {
      next.cfgScaleSpeaker = DEFAULT_CONFIG.cfgScaleSpeaker;
    }
    if (inputSchemaVersion < 3 && Number(input?.chunkMinChars) === 80) {
      next.chunkMinChars = DEFAULT_CONFIG.chunkMinChars;
    }
    if (inputSchemaVersion < 3 && Number(input?.longMessageSpeakerButtonLimit) === 40) {
      next.longMessageSpeakerButtonLimit = DEFAULT_CONFIG.longMessageSpeakerButtonLimit;
    }
    next.storageSchemaVersion = PLUGIN_STORAGE_SCHEMA_VERSION;
    next.serverUrl = normalizeServerUrl(next.serverUrl);
    next.ttsModel = String(next.ttsModel || DEFAULT_CONFIG.ttsModel).trim();
    next.metadataProfileId = normalizeMetadataProfileId(next.metadataProfileId);
    const metadataProfileSyncId = String(next.metadataProfileSyncId || "").trim();
    next.metadataProfileSyncId = metadataProfileSyncId
      ? normalizeMetadataProfileId(metadataProfileSyncId)
      : "";
    next.responseFormat = String(next.responseFormat || "wav").trim().toLowerCase();
    next.defaultVoice = String(next.defaultVoice || "").trim() || "none";
    next.ttsApiKey = String(next.ttsApiKey || "").trim();
    next.numSteps = clampNumber(next.numSteps, 4, 80, DEFAULT_CONFIG.numSteps);
    next.cfgScaleText = clampNumber(next.cfgScaleText, 0, 20, DEFAULT_CONFIG.cfgScaleText);
    next.cfgScaleSpeaker = clampNumber(next.cfgScaleSpeaker, 0, 20, DEFAULT_CONFIG.cfgScaleSpeaker);
    next.cfgScaleCaption = clampNumber(next.cfgScaleCaption, 0, 20, DEFAULT_CONFIG.cfgScaleCaption);
    next.speed = clampNumber(next.speed, 0.25, 4, DEFAULT_CONFIG.speed);
    next.chunkMinChars = clampNumber(next.chunkMinChars, 1, 300, DEFAULT_CONFIG.chunkMinChars);
    next.longMessageSpeakerButtonLimit = Math.floor(clampNumber(
      next.longMessageSpeakerButtonLimit,
      0,
      LONG_MESSAGE_SPEAKER_BUTTON_LIMIT_MAX,
      DEFAULT_CONFIG.longMessageSpeakerButtonLimit,
    ));
    next.batchCaptionConcurrency = Math.floor(clampNumber(
      next.batchCaptionConcurrency,
      1,
      BATCH_CAPTION_CONCURRENCY_MAX,
      DEFAULT_CONFIG.batchCaptionConcurrency,
    ));
    next.readAllPrefetchAhead = Math.floor(clampNumber(
      next.readAllPrefetchAhead,
      0,
      READ_ALL_PREFETCH_AHEAD_MAX,
      DEFAULT_CONFIG.readAllPrefetchAhead,
    ));
    const ttsCacheMode = String(next.ttsCacheMode || "").trim();
    next.ttsCacheMode = TTS_CACHE_MODES.has(ttsCacheMode) ? ttsCacheMode : DEFAULT_CONFIG.ttsCacheMode;
    const cudaCacheCleanupMode = String(next.cudaCacheCleanupMode || "").trim();
    next.cudaCacheCleanupMode = CUDA_CACHE_CLEANUP_MODES.has(cudaCacheCleanupMode)
      ? cudaCacheCleanupMode
      : DEFAULT_CONFIG.cudaCacheCleanupMode;
    next.autoStopOnContextChange = input?.autoStopOnContextChange === false ? false : Boolean(next.autoStopOnContextChange);
    next.referenceVolumeNormalize = Boolean(next.referenceVolumeNormalize);
    next.readAllButtonEnabled = input?.readAllButtonEnabled === false ? false : next.readAllButtonEnabled !== false;
    next.koreanTranslateTts = Boolean(next.koreanTranslateTts);
    next.translationPrompt = String(next.translationPrompt || DEFAULT_TRANSLATION_PROMPT).trim() || DEFAULT_TRANSLATION_PROMPT;
    next.translationPromptPresets = normalizePromptPresets(next.translationPromptPresets);
    next.translationModel = String(next.translationModel || "").trim();
    next.translationEndpoint = String(next.translationEndpoint || "").trim();
    next.translationApiKey = String(next.translationApiKey || "").trim();
    next.translationMethod = (next.translationMethod === "google") ? "google" : "llm";
    next.emotionDirectorEnabled = Boolean(next.emotionDirectorEnabled);
    next.emotionDirectorPrompt = String(next.emotionDirectorPrompt || DEFAULT_EMOTION_DIRECTOR_PROMPT).trim() || DEFAULT_EMOTION_DIRECTOR_PROMPT;
    next.emotionDirectorPromptPresets = normalizePromptPresets(next.emotionDirectorPromptPresets);
    next.emotionDirectorManualCaption = cleanEmotionCaption(next.emotionDirectorManualCaption || "");
    next.debugTtsSeed = normalizeDebugSeedInput(next.debugTtsSeed);
    next.emotionDirectorModel = String(next.emotionDirectorModel || "").trim();
    next.emotionDirectorEndpoint = String(next.emotionDirectorEndpoint || "").trim();
    next.emotionDirectorApiKey = String(next.emotionDirectorApiKey || "").trim();
    next.emotionDirectorContextBefore = clampNumber(next.emotionDirectorContextBefore, 0, 10, DEFAULT_CONFIG.emotionDirectorContextBefore);
    next.emotionDirectorContextAfter = clampNumber(next.emotionDirectorContextAfter, 0, 10, DEFAULT_CONFIG.emotionDirectorContextAfter);
    next.emotionDirectorContinueOnError = input?.emotionDirectorContinueOnError === false ? false : Boolean(next.emotionDirectorContinueOnError);
    next.emotionDirectorCacheEnabled = input?.emotionDirectorCacheEnabled === false ? false : next.emotionDirectorCacheEnabled !== false;
    if (!next.emotionDirectorCacheEnabled) {
      emotionDirectionCache.clear();
    }
    const emotionApplyMode = String(next.emotionDirectorApplyMode || "").trim();
    next.emotionDirectorApplyMode = EMOTION_DIRECTOR_APPLY_MODES.has(emotionApplyMode)
      ? emotionApplyMode
      : DEFAULT_CONFIG.emotionDirectorApplyMode;
    next.captionModelSource = next.captionModelSource === "main" ? "main" : "aux";
    next.lorebookScanPrompt = String(next.lorebookScanPrompt || DEFAULT_LOREBOOK_SCAN_PROMPT).trim() || DEFAULT_LOREBOOK_SCAN_PROMPT;
    next.captionModel = String(next.captionModel || "").trim();
    next.captionEndpoint = String(next.captionEndpoint || "").trim();
    next.captionApiKey = String(next.captionApiKey || "").trim();
    next.ttsModelEndpoint = String(next.ttsModelEndpoint || DEFAULT_CONFIG.ttsModelEndpoint).trim();
    next.voiceDesignCharacterLine = input?.voiceDesignCharacterLine === false ? false : Boolean(next.voiceDesignCharacterLine);
    next.voiceDesignEmotionEmoji = input?.voiceDesignEmotionEmoji === false ? false : Boolean(next.voiceDesignEmotionEmoji);
    next.voiceReferenceCount = normalizeVoiceReferenceCount(next.voiceReferenceCount);
    next.voiceReferenceSampleChars = normalizeVoiceReferenceSampleChars(next.voiceReferenceSampleChars);
    next.voiceDesignGuidance = String(next.voiceDesignGuidance || "").trim();
    next.voiceDesignResearchUrls = String(next.voiceDesignResearchUrls || "").trim().slice(0, 4000);
    next.voiceDesignResearchNotes = String(next.voiceDesignResearchNotes || "").trim().slice(0, 12000);
    next.globalNarrationEnabled = Boolean(next.globalNarrationEnabled);
    next.voiceByCharacter = next.voiceByCharacter && typeof next.voiceByCharacter === "object"
      ? next.voiceByCharacter
      : {};
    next.hiddenBotIds = Array.isArray(next.hiddenBotIds)
      ? Array.from(new Set(next.hiddenBotIds.map((id) => String(id || "").trim()).filter(Boolean)))
      : [];
    next.hiddenBotNames = next.hiddenBotNames && typeof next.hiddenBotNames === "object"
      ? Object.fromEntries(Object.entries(next.hiddenBotNames)
        .map(([id, name]) => [String(id || "").trim(), String(name || "").trim()])
        .filter(([id]) => Boolean(id)))
      : {};
    return next;
  }

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function makePromptPresetId() {
    return `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizePromptPresets(value) {
    if (!Array.isArray(value)) return [];
    const usedIds = new Set();
    const result = [];
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const prompt = String(item.prompt || "").trim().slice(0, MAX_PROMPT_PRESET_PROMPT_CHARS);
      if (!prompt) continue;
      const fallbackName = `프리셋 ${result.length + 1}`;
      const name = String(item.name || fallbackName).trim().slice(0, MAX_PROMPT_PRESET_NAME_CHARS) || fallbackName;
      let id = String(item.id || "").trim();
      if (!id || usedIds.has(id)) id = makePromptPresetId();
      usedIds.add(id);
      result.push({
        id,
        name,
        prompt,
        createdAt: String(item.createdAt || "").trim(),
      });
      if (result.length >= MAX_PROMPT_PRESETS) break;
    }
    return result;
  }

  function promptPresetMeta(kind) {
    if (kind === "emotionDirector") {
      return {
        key: "emotionDirectorPromptPresets",
        textareaId: "emotionDirectorPrompt",
        title: "감정 디렉터 프롬프트 프리셋",
        addLabel: "현재 감정 디렉터 프롬프트 추가",
        emptyText: "저장된 감정 디렉터 프롬프트 프리셋이 없습니다.",
      };
    }
    return {
      key: "translationPromptPresets",
      textareaId: "translationPrompt",
      title: "번역 프롬프트 프리셋",
      addLabel: "현재 번역 프롬프트 추가",
      emptyText: "저장된 번역 프롬프트 프리셋이 없습니다.",
    };
  }

  function promptPresetSnippet(prompt) {
    const text = String(prompt || "").replace(/\s+/g, " ").trim();
    return text.length > 160 ? `${text.slice(0, 160)}...` : text;
  }

  function normalizeVoiceReferenceCount(value) {
    return Math.round(clampNumber(value, 1, MAX_VOICE_REFERENCES_PER_REQUEST, DEFAULT_CONFIG.voiceReferenceCount));
  }

  function normalizeVoiceReferenceSampleChars(value) {
    return Math.round(clampNumber(
      value,
      VOICE_REFERENCE_SAMPLE_CHARS_MIN,
      VOICE_REFERENCE_SAMPLE_CHARS_MAX,
      DEFAULT_CONFIG.voiceReferenceSampleChars,
    ));
  }

  function normalizeDebugSeedInput(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (!/^\d+$/.test(text)) return "";
    const numeric = Number(text);
    if (!Number.isSafeInteger(numeric) || numeric < 0) return "";
    return String(numeric);
  }

  function debugTtsSeedValue() {
    const text = normalizeDebugSeedInput(config.debugTtsSeed);
    if (!text) return null;
    return Number(text);
  }

  function normalizeServerUrl(value) {
    let url = String(value || DEFAULT_CONFIG.serverUrl).trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `http://${url}`;
    }
    return url.replace(/\/+$/, "");
  }

  function hashText(input) {
    let hash = 2166136261;
    const text = String(input || "");
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function htmlEscape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeVoiceColor(value) {
    const color = String(value || "").trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(color)) return "";
    return VOICE_COLOR_PRESETS.some(([preset]) => preset === color) ? color : "";
  }

  function defaultVoiceColorForCharacter(characterId, characterName = "") {
    const key = String(characterId || characterName || "voice").trim();
    const index = parseInt(hashText(key), 36) % VOICE_COLOR_PRESETS.length;
    return VOICE_COLOR_PRESETS[index]?.[0] || VOICE_COLOR_PRESETS[0][0];
  }

  function characterColorFromReferenceSet(referenceSet, fallbackId = "", fallbackName = "") {
    return normalizeVoiceColor(referenceSet?.displayColor)
      || defaultVoiceColorForCharacter(referenceSet?.characterId || fallbackId, referenceSet?.characterName || fallbackName);
  }

  function voiceColorDot(color) {
    const safeColor = normalizeVoiceColor(color);
    if (!safeColor) return "";
    return `<span class="rt-color-dot" aria-hidden="true" style="background:${safeColor};"></span>`;
  }

  function chatButtonLabelWithColor(label, color) {
    const safeColor = normalizeVoiceColor(color);
    const safeLabel = htmlEscape(label);
    if (!safeColor) return safeLabel;
    return [
      `<span aria-hidden="true" style="position:relative;display:inline-flex;align-items:center;justify-content:center;line-height:1;vertical-align:middle;">`,
      `<span>${safeLabel}</span>`,
      `<span style="position:absolute;right:0.02em;bottom:0.08em;width:0.28em;height:0.28em;border-radius:999px;background:${safeColor};box-shadow:0 0 0 1px rgba(15,23,42,0.42);"></span>`,
      `</span>`,
    ].join("");
  }

  function truncateLogText(value, limit = 1800) {
    const text = String(value ?? "").replace(/\r\n/g, "\n").trim();
    if (text.length <= limit) return text;
    return `${text.slice(0, limit).trimEnd()}\n...(${text.length - limit}자 생략)`;
  }

  function lastTtsRequestDebugText() {
    if (!lastTtsRequestDebug) {
      return "아직 TTS 요청이 없습니다. 채팅 세션에서 스피커 버튼을 누르면 마지막 요청 정보가 여기에 표시됩니다.";
    }
    try {
      return JSON.stringify(lastTtsRequestDebug, null, 2);
    } catch {
      return String(lastTtsRequestDebug || "");
    }
  }

  function refreshLastTtsRequestDebugView() {
    try {
      const target = document.getElementById("rt-last-tts-request");
      if (target) target.textContent = lastTtsRequestDebugText();
    } catch {
      // The settings screen is not always open.
    }
  }

  function logDetailsToText(details) {
    if (details == null || details === "") return "";
    if (typeof details === "string") return truncateLogText(details);
    try {
      const seen = new WeakSet();
      return truncateLogText(JSON.stringify(details, (key, value) => {
        if (/(api.?key|authorization|token|password|secret)/i.test(key)) return "(hidden)";
        if (typeof value === "string") return truncateLogText(value, 900);
        if (value && typeof value === "object") {
          if (seen.has(value)) return "[Circular]";
          seen.add(value);
        }
        return value;
      }, 2));
    } catch {
      return truncateLogText(String(details));
    }
  }

  const LOG_COPY_REDACTED_TEXT_KEYS = new Set([
    "caption",
    "captionja",
    "content",
    "emotioncaption",
    "input",
    "originaltext",
    "prompt",
    "reason",
    "sample",
    "samplelines",
    "sourcetext",
    "spokentext",
    "text",
    "translatedtext",
    "ttstext",
  ]);

  const LOG_COPY_URL_KEYS = new Set([
    "endpoint",
    "serverurl",
    "ttsmodelendpoint",
    "url",
  ]);

  function normalizeLogCopyKey(key) {
    return String(key || "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  }

  function isPrivateOrLocalHost(hostname) {
    const host = String(hostname || "").toLowerCase();
    return host === "localhost"
      || host === "127.0.0.1"
      || host === "::1"
      || host.startsWith("192.168.")
      || host.startsWith("10.")
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  }

  function sanitizeUrlForLogCopy(value) {
    const raw = String(value || "").trim();
    if (!raw) return raw;
    try {
      const parsed = new URL(raw);
      const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
      if (isPrivateOrLocalHost(parsed.hostname)) {
        return `${parsed.protocol}//${parsed.host}${path}${parsed.search ? "?..." : ""}`;
      }
      return `${parsed.protocol}//<redacted-host:${hashText(parsed.hostname)}>${path}${parsed.search ? "?..." : ""}`;
    } catch {
      return sanitizeSecretTokensForLogCopy(raw);
    }
  }

  function sanitizeSecretTokensForLogCopy(value) {
    return String(value || "")
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [redacted]")
      .replace(/\b(sk|hf|ghp|github_pat|xox[baprs])-[-A-Za-z0-9_]{10,}\b/gi, "[redacted-token]")
      .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[redacted-token]")
      .replace(/((?:api[_-]?key|apikey|token|password|secret)\s*[:=]\s*)[^&\s"',}]+/gi, "$1[redacted]");
  }

  function sanitizeFreeTextForLogCopy(value) {
    return sanitizeSecretTokensForLogCopy(String(value || ""))
      .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => sanitizeUrlForLogCopy(url));
  }

  function redactedLogCopySummary(value, label = "text") {
    let text = "";
    let items = 0;
    if (Array.isArray(value)) {
      items = value.length;
      text = value.map((item) => {
        if (item == null) return "";
        return typeof item === "string" ? item : JSON.stringify(item);
      }).join("\n");
    } else if (value && typeof value === "object") {
      text = JSON.stringify(value);
    } else {
      text = String(value ?? "");
    }
    if (!text) return "";
    const itemPart = items ? `, items=${items}` : "";
    return `[redacted ${label}: chars=${text.length}${itemPart}, hash=${hashText(text)}]`;
  }

  function sanitizeLogCopyValue(key, value, seen = new WeakSet()) {
    const normalizedKey = normalizeLogCopyKey(key);
    if (LOG_COPY_REDACTED_TEXT_KEYS.has(normalizedKey)) {
      return redactedLogCopySummary(value, normalizedKey || "text");
    }
    if (LOG_COPY_URL_KEYS.has(normalizedKey) && typeof value === "string") {
      return sanitizeUrlForLogCopy(value);
    }
    if (typeof value === "string") return sanitizeFreeTextForLogCopy(value);
    if (!value || typeof value !== "object") return value;
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeLogCopyValue(key, item, seen));
    }
    const output = {};
    Object.entries(value).forEach(([childKey, childValue]) => {
      output[childKey] = sanitizeLogCopyValue(childKey, childValue, seen);
    });
    return output;
  }

  function sanitizeLogDetailsTextForCopy(details) {
    if (!details) return "";
    const text = String(details);
    try {
      const parsed = JSON.parse(text);
      return truncateLogText(JSON.stringify(sanitizeLogCopyValue("", parsed), null, 2));
    } catch {
      return truncateLogText(sanitizeFreeTextForLogCopy(text));
    }
  }

  function addRuntimeLog(title, details = "") {
    runtimeLogs.push({
      time: new Date().toLocaleString("ko-KR", { hour12: false }),
      title: String(title || "로그"),
      details: logDetailsToText(details),
    });
    while (runtimeLogs.length > LOG_LIMIT) {
      runtimeLogs.shift();
    }
  }

  function monotonicNow() {
    try {
      if (globalThis.performance && typeof globalThis.performance.now === "function") {
        return globalThis.performance.now();
      }
    } catch {
      // Fall through to Date.now().
    }
    return Date.now();
  }

  function elapsedMsSince(startedAt) {
    const elapsedMs = Math.round(monotonicNow() - Number(startedAt || 0));
    return Number.isFinite(elapsedMs) && elapsedMs >= 0 ? elapsedMs : 0;
  }

  function sleepMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));
  }

  function boundedRetryDelayMs(value) {
    const ms = Math.round(Number(value || 0));
    if (!Number.isFinite(ms) || ms <= 0) return 0;
    return Math.min(ms, READ_ALL_RETRY_DELAY_MAX_MS);
  }

  function retryDelayMsFromText(text) {
    const source = String(text || "");
    let match = source.match(/(\d+(?:\.\d+)?)\s*초\s*후/);
    if (match) return boundedRetryDelayMs(Number(match[1]) * 1000);
    match = source.match(/retry[-\s]?after[^0-9]*(\d+(?:\.\d+)?)/i);
    if (match) return boundedRetryDelayMs(Number(match[1]) * 1000);
    return 0;
  }

  function retryDelayMsFromError(error, fallbackMs = 0) {
    const explicit = boundedRetryDelayMs(error?.retryAfterMs || 0);
    if (explicit) return explicit;
    const fromText = retryDelayMsFromText(describeError(error));
    if (fromText) return fromText;
    const status = Number(error?.status || error?.httpStatus || 0);
    return status === 429 ? boundedRetryDelayMs(fallbackMs) : 0;
  }

  function addSlowRuntimeLog(label, startedAt, details = {}) {
    const elapsedMs = elapsedMsSince(startedAt);
    if (elapsedMs < PERF_LOG_THRESHOLD_MS) return;
    const now = Date.now();
    const key = String(label || "unknown");
    const lastAt = performanceLogTimes.get(key) || 0;
    if (now - lastAt < PERF_LOG_COOLDOWN_MS) return;
    performanceLogTimes.set(key, now);
    addRuntimeLog("성능 경고", {
      label: key,
      elapsedMs,
      ...details,
    });
  }

  function addReadAllIgnoredClickLog(contentHash, source, reason) {
    readAllIgnoredClickCount += 1;
    const sampleKey = `${String(source || "unknown")}\n${String(reason || "")}\n${String(contentHash || "")}`;
    const existing = readAllIgnoredClickSamples.get(sampleKey) || {
      source: String(source || "unknown"),
      reason: String(reason || ""),
      contentHash: String(contentHash || ""),
      count: 0,
    };
    existing.count += 1;
    readAllIgnoredClickSamples.set(sampleKey, existing);

    const now = Date.now();
    if (now - readAllIgnoredClickLogAt < READ_ALL_IGNORED_CLICK_LOG_INTERVAL_MS) return;
    readAllIgnoredClickLogAt = now;
    const samples = Array.from(readAllIgnoredClickSamples.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    addRuntimeLog("전체 읽기 버튼 클릭 무시 요약", {
      count: readAllIgnoredClickCount,
      samples,
    });
    readAllIgnoredClickCount = 0;
    readAllIgnoredClickSamples.clear();
  }

  function formatRuntimeLogs(options = {}) {
    if (!runtimeLogs.length) {
      return "아직 기록된 로그가 없습니다.";
    }
    const sanitizeForReport = Boolean(options.sanitizeForReport);
    return runtimeLogs
      .map((entry, index) => {
        const head = `${index + 1}. [${entry.time}] ${entry.title}`;
        const details = sanitizeForReport ? sanitizeLogDetailsTextForCopy(entry.details) : entry.details;
        return details ? `${head}\n${details}` : head;
      })
      .join("\n\n");
  }

  function formatRuntimeLogsForCopy() {
    return [
      "RisuTTS 로그(민감정보 가림)",
      "본문, 번역문, 프롬프트, 감정 캡션, 외부 URL, 토큰류는 버그 리포트용으로 마스킹했습니다.",
      "",
      formatRuntimeLogs({ sanitizeForReport: true }),
    ].join("\n");
  }

  function hasJapanese(text) {
    return /[\u3040-\u30ff]/.test(text);
  }

  function hasKorean(text) {
    return /[\uac00-\ud7a3]/.test(text);
  }

  function hasEnglish(text) {
    const plain = stripInlineHtml(text);
    if (!plain || hasJapanese(plain) || hasKorean(plain)) return false;
    const words = plain.match(/[A-Za-z][A-Za-z'’.-]*/g) || [];
    if (!words.length) return false;
    const letters = words.join("").replace(/[^A-Za-z]/g, "");
    return letters.length >= 2 && /[aeiouy]/i.test(letters);
  }

  function getSegmentMode(text) {
    if (hasJapanese(text)) return "ja";
    if (hasKorean(text)) return config.koreanTranslateTts ? "ko" : null;
    if (hasEnglish(text)) return config.koreanTranslateTts ? "en" : null;
    return null;
  }

  function decorateLogSample(value) {
    return stripInlineHtmlPreserveLines(stripRisuThoughtBlocks(value))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
  }

  function describeDecorateSkipRule(content) {
    const text = String(content || "");
    if (!text || typeof content !== "string") return { reason: "invalid-content" };
    if (/(?:x-risu-risutts-|data-risu-risutts-|x-risutts-|data-risutts-|risutts-action|risutts-read-all)/i.test(text)) {
      return { reason: "contains-risutts-marker" };
    }
    if (text.includes("```")) return { reason: "contains-code-fence" };
    const blockedTag = text.match(/<(pre|code|style|script|svg|canvas)\b/i);
    if (blockedTag) return { reason: "contains-blocked-tag", tag: blockedTag[1] || "" };
    if (looksLikeCssSnippet(text)) return { reason: "looks-like-css" };
    if (text.length > 12000) return { reason: "too-long", limit: 12000 };
    return null;
  }

  function shouldSkipDecorating(content) {
    return Boolean(describeDecorateSkipRule(content));
  }

const stripRisuTtsControlsCache = new Map();
  const STRIP_RISUTTS_CACHE_MAX = 200;
  function stripRisuTtsControls(html) {
    const input = String(html || "");
    if (!input) return input;
    if (input.length > 8192) return stripRisuTtsControlsUncached(input);
    const cached = stripRisuTtsControlsCache.get(input);
    if (cached != null) return cached;
    const result = stripRisuTtsControlsUncached(input);
    if (stripRisuTtsControlsCache.size >= STRIP_RISUTTS_CACHE_MAX) {
      const firstKey = stripRisuTtsControlsCache.keys().next().value;
      if (firstKey) stripRisuTtsControlsCache.delete(firstKey);
    }
    stripRisuTtsControlsCache.set(input, result);
    return result;
  }
  function stripRisuTtsControlsUncached(html) {
    return String(html || "")
      .replace(/<(?:span|div)\b(?=[^>]*\brisutts-(?:wrap|read-all-wrap)\b)[\s\S]*?<\/(?:span|div)>/gi, "")
      .replace(/<button\b(?=[^>]*\brisutts-(?:action|read-all)\b)[\s\S]*?(?:<\/button>|>)/gi, "")
      .replace(/&lt;(?:span|div)\b(?=[\s\S]{0,900}?\brisutts-(?:wrap|read-all-wrap)\b)[\s\S]{0,2600}?&lt;\/(?:span|div)&gt;/gi, "")
      .replace(/&lt;button\b(?=[\s\S]{0,900}?\brisutts-(?:action|read-all)\b)[\s\S]{0,1800}?(?:&lt;\/button&gt;|&gt;)/gi, "")
      .replace(/<(?:span|div)\b[^>]*class=(["'])[^"']*\brisutts-read-all-wrap\b[^"']*\1[^>]*>\s*<button\b[\s\S]*?<\/button>\s*<\/(?:span|div)>/gi, "")
      .replace(/<span\b[^>]*class=(["'])[^"']*\brisutts-wrap\b[^"']*\1[^>]*>\s*<button\b[\s\S]*?<\/button>\s*<\/span>/gi, "")
      .replace(/<button\b[^>]*class=(["'])[^"']*\brisutts-read-all\b[^"']*\1[\s\S]*?<\/button>/gi, "")
      .replace(/<button\b[^>]*class=(["'])[^"']*\brisutts-action\b[^"']*\1[\s\S]*?<\/button>/gi, "")
      .replace(/<(?:span|div)\b(?=[\s\S]{0,1400}?\brisutts-(?:wrap|read-all-wrap)\b)[\s\S]{0,4200}?(?:<\/(?:span|div)>|>\s*)/gi, "")
      .replace(/<button\b(?=[\s\S]{0,1400}?\brisutts-(?:action|read-all|payload-)\b)[\s\S]{0,3200}?(?:<\/button>|>\s*(?:🔊|▶|■)?)/gi, "")
      .replace(/&lt;(?:span|div)\b(?=[\s\S]{0,1400}?\brisutts-(?:wrap|read-all-wrap)\b)[\s\S]{0,4200}?(?:&lt;\/(?:span|div)&gt;|&gt;\s*)/gi, "")
      .replace(/&lt;button\b(?=[\s\S]{0,1400}?\brisutts-(?:action|read-all|payload-)\b)[\s\S]{0,3200}?(?:&lt;\/button&gt;|&gt;\s*(?:🔊|▶|■)?)/gi, "")
      .replace(/["“]\s*(?:x-risu-risutts-|data-risu-risutts-|x-risutts-|data-risutts-)[\s\S]{0,3200}?title\s*=\s*["“][^""]*RisuTTS[\s\S]{0,800}?["”]\s*>\s*(?:🔊|▶|■)?/gi, "");
  }

  function stripRisuCssErrors(value) {
    return String(value || "")
      .replace(/(?:\s*CSS ERROR:\s*Error\s*:\d+:\d+:\s*missing\s*['"]?\}['"]?\s*)+/gi, " ")
      .replace(/^[ \t]+|[ \t]+$/g, "");
  }

  const stripInlineHtmlCache = new Map();
  const STRIP_INLINE_HTML_CACHE_MAX = 300;
  function stripInlineHtml(value) {
    const input = String(value || "");
    if (!input) return input;
    if (input.length > 4096) return stripInlineHtmlUncached(input);
    const cached = stripInlineHtmlCache.get(input);
    if (cached != null) return cached;
    const result = stripInlineHtmlUncached(input);
    if (stripInlineHtmlCache.size >= STRIP_INLINE_HTML_CACHE_MAX) {
      const firstKey = stripInlineHtmlCache.keys().next().value;
      if (firstKey) stripInlineHtmlCache.delete(firstKey);
    }
    stripInlineHtmlCache.set(input, result);
    return result;
  }
  function stripInlineHtmlUncached(value) {
    return String(value || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripBalancedMarkdownEmphasis(value) {
    let text = String(value || "").trim();
    for (let pass = 0; pass < 3; pass += 1) {
      const match = text.match(/^(\*{1,3}|_{1,3})([\s\S]*?)\1$/);
      if (!match || !String(match[2] || "").trim()) break;
      text = String(match[2]).trim();
    }
    return text;
  }

  function cleanSegmentSourceText(value) {
    return stripBalancedMarkdownEmphasis(stripInlineHtml(stripRisuTtsControls(value)));
  }

  function cleanNarrationSourceText(value) {
    const text = cleanSegmentSourceText(value);
    if (!text) return "";
    const thought = text.match(/^\s*(?:['‘’]([^'‘’\n]{1,220})['‘’]|『([^』\n]{1,220})』)\s*$/);
    return thought ? cleanSegmentSourceText(thought[1] || thought[2] || "") : text;
  }

  function isRisuEffectLine(value) {
    const text = cleanSegmentSourceText(value);
    if (!text) return false;
    if (/^\s*§[^§\n]{1,700}§(?:\s*(?:[:：-]\s*)?.*)?$/.test(text)) return true;
    return /^\s*(?:SFX|SE|sound\s*effect|효과음|음향|効果音)\s*[:：]/i.test(text);
  }

  function isRisuImageAssetLine(value) {
    const raw = String(value || "").trim();
    if (!raw) return false;
    if (/<\s*img(?:\s|=|>|\/)/i.test(raw) || /&lt;\s*img(?:\s|=|&gt;|\/)/i.test(raw)) return true;
    if (/!\[[^\]\n]{0,120}\]\([^\)\n]{1,500}\)/.test(raw)) return true;
    if (/\{\{\s*(?:image|img|asset|sprite|portrait|background|bg|cg|chardisplayasset)\b[^}]*\}\}/i.test(raw)) return true;
    if (/^\s*(?:<|&lt;)?(?:img|image|asset)\s*=\s*["'][^"']+["']\s*(?:>|&gt;)?\s*$/i.test(raw)) return true;
    const text = cleanSegmentSourceText(value).replace(/\s+/g, " ").trim();
    if (!text) return false;
    if (/🖼️?/u.test(text)) return true;
    const assetWords = "(?:image|img|asset|cg|sprite|portrait|background|bg|illust|illustration|立ち絵|画像|素材|그림|이미지|에셋|배경|스탠딩)";
    if (new RegExp(`^\\s*\\[\\s*${assetWords}(?:\\s*[|｜,;/]\\s*[^\\]\\n]+){1,}\\s*\\]\\s*$`, "iu").test(text)) return true;
    if (new RegExp(`^\\s*${assetWords}\\s*[:：|｜]\\s*[^\\n]{1,240}$`, "iu").test(text)) return true;
    const bracketed = text.match(/^\s*\[\s*([^\]\n]{1,260})\s*\]\s*$/);
    if (bracketed) {
      const parts = bracketed[1]
        .split(/[|｜]/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length >= 3 && new RegExp(assetWords, "iu").test(parts[0])) return true;
    }
    return false;
  }

  function isDateTimeMetadataLine(value) {
    const text = cleanSegmentSourceText(value).replace(/\s+/g, " ").trim();
    if (!text) return false;
    const hasDate = /\b\d{4}[-./]\d{1,2}[-./]\d{1,2}\b/.test(text)
      || /\b\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일\b/.test(text);
    const hasTime = /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/.test(text)
      || /\b(?:오전|오후)\s*\d{1,2}\s*시\b/.test(text);
    const hasWeekday = /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i.test(text)
      || /(?:월|화|수|목|금|토|일)(?:요일)?/.test(text);
    if (hasDate && (hasTime || hasWeekday)) return true;
    if (/^[📅🗓️⏰🕒\s\d:./\-\u200d\ufe0fAPMapm年月日오전후월화수목금토일]+$/.test(text) && (hasDate || hasTime)) return true;
    return false;
  }

  function hasSpeakerCueEmoji(value) {
    return /(?:👩|👨|⚡️?|🤖|🐕|👻|💀)/u.test(String(value || ""));
  }

  function isValidCueSpeakerName(value) {
    const text = cleanSpeakerName(value);
    const compact = text.replace(/\s+/g, "");
    if (!compact) return false;
    if (/^[A-Za-z][A-Za-z0-9_.'-]{0,39}$/.test(compact)) return true;
    return /^[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7a3][\u3040-\u30ff\u3400-\u9fff\uac00-\ud7a3A-Za-z0-9０-９_.'・ー-]{0,39}$/u.test(compact);
  }

  function isLikelyInvalidExplicitCueSpeakerPrefix(value) {
    const raw = stripInlineHtml(value).replace(/\s+/g, " ").trim();
    if (!raw) return true;
    if (/^(?:\d+|[０-９]+)\s*[\.\)]/.test(raw)) return true;
    if (/^[#>*•\-]+/.test(raw)) return true;
    if (/\b(?:CSS\s+ERROR|SFW\s+ASSETS|NSFW\s+ASSETS|YURINSFW\s+ASSETS)\b/i.test(raw)) return true;
    if (/^(?:제작자|코멘트|퍼스트|메시지|언어|설정|콘텐츠|랜덤|닫기|로그)$/i.test(raw)) return true;
    if (/^(?:creator|comment|first|message|language|setting|settings|content|random|close|log)$/i.test(raw)) return true;
    if (/^(?:affiliation|birth|breathing|combat|feature|features|personality|profile|relationship|technique|voice|weapon|occupation|summary|description|appearance|background|status|rank|gender|age|year)$/i.test(raw)) return true;
    if (isCssPropertyName(raw)) return true;
    if (/[{};]/.test(raw)) return true;
    if (raw.length > 28 && /\s/.test(raw)) return true;
    if (!/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7a3]/.test(raw) && raw.split(/\s+/).length > 3) return true;
    return false;
  }

  function speakerPrefixMatchInfo(value) {
    const speakerName = cleanSpeakerName(value);
    if (!speakerName) return { speakerName: "", matched: null };
    if (isLikelyUiListSpeakerPrefix(speakerName)) return { speakerName, matched: null };
    if (isBadLoreCandidateName(speakerName, "")) return { speakerName, matched: null };
    const matched = findVoiceCharacterBySpeaker(speakerName, lastKnownCharacterId || "");
    return { speakerName, matched };
  }

  function explicitCueSpeakerMatchInfo(value) {
    const speakerName = cleanSpeakerName(value);
    if (!speakerName) return { speakerName: "", matched: null };
    if (isLikelyInvalidExplicitCueSpeakerPrefix(speakerName)) return { speakerName, matched: null };
    if (isBadLoreCandidateName(speakerName, "")) return { speakerName, matched: null };
    const matched = findVoiceCharacterBySpeaker(speakerName, lastKnownCharacterId || "");
    return { speakerName, matched };
  }

  function looksLikeLooseSpeakerQuoteLine(value) {
    const text = cleanSegmentSourceText(value);
    if (!text) return false;
    if (isRisuStatusMetadataLine(text)) return false;
    const match = text.match(/^([^:：<>\n]{1,40})[:：]\s*[「“"]/u);
    if (!match) return false;
    const { speakerName, matched } = speakerPrefixMatchInfo(match[1]);
    return Boolean(speakerName && matched);
  }

  function isRisuStatusMetadataLine(value) {
    const raw = String(value || "");
    const text = cleanSegmentSourceText(value);
    if (!text) return false;
    const normalized = text.replace(/\s+/g, " ").trim();
    if (isRisuImageAssetLine(normalized)) return true;
    if (isDateTimeMetadataLine(normalized)) return true;
    if (/^\s*(?:<|&lt;)\/?stats\b/i.test(raw)) return true;
    if (/^\s*\[(?:NPC_LIST|INTIMATE(?:_3P)?_STATUS|[A-Z0-9_]+_STATUS)\b/i.test(normalized)) return true;
    if (/^\s*(?:Outfit|Condition|Inventory|Location|Status|Favor|Time|Date|Position|Details)\s*[:：]/i.test(normalized)) return true;
    if (/^\s*(?:복장|상태|소지품|인벤토리|위치|장소|호감도?|시간|날짜|자세|상황|상세|컨디션)\s*[:：]/i.test(normalized)) return true;
    if (/^\s*[^\n\[\]]{1,60}\s+\S+\s*-?\d{1,3}%\s+(?:Status\s+)?[^\n]+\[[^\]\n]{1,80}\]\s*$/i.test(normalized)) return true;
    if (/^\s*\[[^\]\n]{1,120}\]\s*$/.test(normalized) && /(?:\d{1,2}:\d{2}|오전|오후|\b(?:AM|PM|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b|\d{4}[-./년]|(?:월|화|수|목|금|토|일)(?:요일)?)/i.test(normalized)) return true;
    const labelMatches = normalized.match(/(?:^|[\[|｜\s])(?:날짜|시간|지역|장소|동행|돈|물건|장비|현재\s*목표|현재목표|목표|상태|복장|소지품|인벤토리|위치|호감도?|date|time|location|place|area|companion|money|item|equipment|inventory|objective|goal|status|condition|outfit|favor)\s*[:：]/gi) || [];
    if (labelMatches.length >= 2) return true;
    if (/^\s*\[[\s\S]{8,700}\]\s*$/.test(normalized) && /\|/.test(normalized) && /[:：]/.test(normalized)) return true;
    return false;
  }

  function isRisuPromptMetaHeadingLine(value) {
    const text = cleanSegmentSourceText(value).replace(/\s+/g, " ").trim();
    if (!text) return false;
    const normalized = text.replace(/^[∮∯]+\s*/, "").trim();
    if (/^#{1,6}\s*(?:Response|응답|応答|响应|OOC|Post-response|사후응답|事後応答)(?:\b|$)/i.test(normalized)) return true;
    if (/^#{1,6}\s*(?:Chat\s*index|Chatindex)(?:\b|[:：\s]|$)/i.test(normalized)) return true;
    if (/^#{2,6}\s*(?:(?:Volume|볼륨|巻|卷)\b|(?:제?\s*\d+\s*권\b)|(?:\d+\s*권\b))/i.test(normalized)) return true;
    if (/^#{2,6}\s*(?:(?:Chapter|챕터|章)\b|(?:제?\s*\d+\s*장\b)|(?:\d+\s*장\b))/i.test(normalized)) return true;
    return /^#{1,6}\s+\S/.test(normalized);
  }

  function isRisuMarkdownTableLine(value) {
    const text = cleanSegmentSourceText(value).trim();
    if (!text || !text.includes("|")) return false;
    const pipeCount = (text.match(/\|/g) || []).length;
    if (/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(text)) return true;
    if (pipeCount >= 2 && /^\s*\|[\s\S]*\|\s*$/.test(text)) return true;
    return pipeCount >= 3 && /(?:status|condition|outfit|inventory|location|time|date|favor|objective|goal|상태|복장|소지품|인벤토리|위치|장소|시간|날짜|호감|목표)/i.test(text);
  }

  function isRisuHtmlScaffoldLine(value) {
    const raw = String(value || "").trim();
    if (!raw) return false;
    if (/^\s*(?:<!DOCTYPE\b|<\/?(?:html|head|body|style|script|details|summary)\b|<\/?(?:Thoughts?|stats)\b)/i.test(raw)) return true;
    if (/^\s*(?:&lt;!DOCTYPE\b|&lt;\/?(?:html|head|body|style|script|details|summary)\b|&lt;\/?(?:Thoughts?|stats)\b)/i.test(raw)) return true;
    const text = cleanSegmentSourceText(raw).trim();
    if (!text) return false;
    if (/^\s*(?:\{|\}|\/\*|\*\/)\s*$/.test(text)) return true;
    if (/^\s*[.#]?[a-z0-9_-]+(?:\s+[.#]?[a-z0-9_-]+)*\s*\{/i.test(text)) return true;
    return looksLikeCssSnippet(raw) && text.length < 260;
  }

  function risuThoughtBlockBoundary(value) {
    const raw = String(value || "");
    return {
      starts: /(?:<|&lt;)\s*(?:Thoughts?|thinking)\b/i.test(raw) || /\bregex-thought-block\b/i.test(raw),
      ends: /(?:<|&lt;)\/\s*(?:Thoughts?|thinking)\s*(?:>|&gt;)/i.test(raw),
    };
  }

  function stripRisuThoughtBlocks(value) {
    return String(value || "")
      .replace(/<[^>]*\bregex-thought-block\b[^>]*>[\s\S]*?<\/(?:div|section|details)>/gi, "\n")
      .replace(/<Thoughts?\b[\s\S]*?<\/Thoughts?>/gi, "\n")
      .replace(/<thinking\b[\s\S]*?<\/thinking>/gi, "\n")
      .replace(/&lt;Thoughts?\b[\s\S]*?&lt;\/Thoughts?&gt;/gi, "\n")
      .replace(/&lt;thinking\b[\s\S]*?&lt;\/thinking&gt;/gi, "\n");
  }

  function isRisuTtsForbiddenLine(value) {
    const raw = String(value || "");
    if (!raw.trim()) return false;
    const text = cleanSegmentSourceText(raw);
    if (/\bregex-thought-block\b/i.test(raw)) return true;
    if (/(?:x-risu-risutts-|data-risu-risutts-|x-risutts-|data-risutts-|risutts-action|risutts-read-all)/i.test(raw)) return true;
    if (/<(button|input|textarea|select|script|style|svg|canvas|audio|video)\b/i.test(raw)) return true;
    if (isRisuEffectLine(raw)) return true;
    if (isRisuImageAssetLine(raw)) return true;
    if (isRisuStatusMetadataLine(raw)) return true;
    if (isRisuMarkdownTableLine(raw)) return true;
    if (isRisuPromptMetaHeadingLine(raw)) return true;
    if (isRisuHtmlScaffoldLine(raw)) return true;
    if (/^(?:応答|response|assistant\s*response|응답|post-response|사후응답|事後応答)$/i.test(text)) return true;
    if (/^(?:chat\s*index|chatindex)\b\s*[:：]?\s*\S*/i.test(text)) return true;
    if (/^(?:巻|章)\s*\d+\s*[:：]/i.test(text)) return true;
    return /[∮∯]/.test(text) && /(?:chat\s*index|chatindex|^\s*#{1,6})/i.test(text);
  }

  function stripInlineHtmlPreserveLines(value) {
    return String(value || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|blockquote|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function isCssPropertyName(value) {
    return CSS_PROPERTY_NAME_PATTERN.test(String(value || "").trim());
  }

  function cssDeclarationName(line) {
    const match = String(line || "").trim().match(/^([a-z][a-z0-9-]*)\s*:/i);
    return match ? match[1] : "";
  }

  function looksLikeCssSnippet(value) {
    const raw = String(value || "");
    if (!raw.trim()) return false;
    if (/<style\b/i.test(raw)) return true;
    const text = stripInlineHtmlPreserveLines(raw);
    const lines = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const cssLines = lines.filter((line) => {
      const name = cssDeclarationName(line);
      if (!name || !isCssPropertyName(name)) return false;
      return /[;{}]|#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(?:px|em|rem|vh|vw|%)\b/i.test(line);
    });
    if (cssLines.length >= 1) return true;
    if (/^\s*[.#]?[a-z0-9_-]+(?:\s+[.#]?[a-z0-9_-]+)*\s*\{/i.test(text)) return true;
    return false;
  }

  function looksLikeRisuNonChatUi(html) {
    const text = stripInlineHtml(html);
    if (!text) return true;
    const compact = text.replace(/\s+/g, " ").trim();
    if (looksLikeCssSnippet(html)) return true;
    if (/CSS ERROR:/i.test(compact)) return true;
    if (/(?:SFW\s+ASSETS|NSFW\s+ASSETS|YURINSFW\s+ASSETS)/i.test(compact)) return true;
    if (/(?:제작자\s*코멘트|언어\s*설정|퍼스트\s*메시지|콘텐츠는\s*AI로\s*생성|언어와\s*.+성별을\s*선택|무언가\s*입력.*채팅.*시작)/i.test(compact)) return true;
    if (/한국어\s*English\s*日本語/i.test(compact)) return true;
    if (/^(?:채팅|캐릭터|새\s*채팅|닫기|로그|설정)$/i.test(compact)) return true;
    return false;
  }

  function isNumberedUiList(text) {
    const lines = String(text || "")
      .split(/\n+/)
      .map((line) => stripInlineHtml(line).trim())
      .filter(Boolean);
    return lines.filter((line) => /^(?:\d+|[０-９]+)\s*[\.\)]\s+/.test(line)).length >= 2;
  }

  function startsWithDialogueQuote(line) {
    const text = stripInlineHtml(line).trim();
    return /^[「“"][^」”"\n]{1,320}[」”"]/.test(text);
  }

  function looksLikeDialogueQuoteInContext(source, offset, body) {
    const bodyText = stripInlineHtml(body);
    const mode = getSegmentMode(bodyText);
    if (!mode) return false;
    const rawBefore = String(source || "").slice(0, offset);
    const before = stripInlineHtmlPreserveLines(rawBefore);
    if (!before.trim()) return true;
    if (/(?:[\n\r]|<br\s*\/?>)\s*$/i.test(rawBefore)) return true;
    if (/[。！？!?]\s*$/.test(before)) return true;
    if (/[。！？!?…]\s*$/.test(bodyText)) return true;
    if (bodyText.length >= 12 && /[、。！？!?…]/.test(bodyText)) return true;
    return false;
  }

  function hasDialogueQuote(html) {
    const text = stripInlineHtmlPreserveLines(html);
    const pattern = /([「“"])([^」”"\n]{1,320})([」”"])/g;
    let match;
    while ((match = pattern.exec(text))) {
      if (looksLikeDialogueQuoteInContext(text, match.index, match[2])) return true;
    }
    return false;
  }

  function hasColonlessShortInlineQuote(value) {
    const text = cleanSegmentSourceText(value);
    if (!text) return false;
    const pattern = /([「“"])([^」”"\n]{1,80})([」”"])/g;
    let match;
    while ((match = pattern.exec(text))) {
      const body = cleanSegmentSourceText(match[2]);
      if (!body || body.length > 24) continue;
      if (/[。！？!?…\n]/.test(body)) continue;
      const before = text.slice(0, match.index).replace(/\s+$/g, "");
      if (!before) continue;
      const previous = before.slice(-1);
      if (previous !== ":" && previous !== "：") return true;
    }
    return false;
  }

  function hasStandaloneThoughtQuote(value) {
    const text = cleanSegmentSourceText(value);
    if (!text || text.length > 140) return false;
    if (/^\s*['‘’][^'‘’\n]{1,120}['‘’]\s*$/.test(text)) return true;
    if (/^\s*『[^』\n]{1,120}』\s*$/.test(text)) return true;
    return false;
  }

  function isRisuThoughtDisplayLine(value) {
    const raw = String(value || "");
    if (/\bregex-thought-block\b/i.test(raw)) return true;
    return hasStandaloneThoughtQuote(raw);
  }

  function isLikelyUiListSpeakerPrefix(value) {
    const raw = stripInlineHtml(value).replace(/\s+/g, " ").trim();
    if (!raw) return true;
    if (/^(?:\d+|[０-９]+)\s*[\.\)]/.test(raw)) return true;
    if (/^[#>*•\-]+/.test(raw)) return true;
    if (/\b(?:CSS\s+ERROR|SFW\s+ASSETS|NSFW\s+ASSETS|YURINSFW\s+ASSETS)\b/i.test(raw)) return true;
    if (/^(?:제작자|코멘트|퍼스트|메시지|언어|설정|콘텐츠|랜덤|닫기|로그)$/i.test(raw)) return true;
    if (/^(?:creator|comment|first|message|language|setting|settings|content|random|close|log)$/i.test(raw)) return true;
    if (/^(?:affiliation|birth|breathing|combat|feature|features|personality|profile|relationship|technique|voice|weapon|occupation|summary|description|appearance|background|status|rank|gender|age|year)$/i.test(raw)) return true;
    if (isCssPropertyName(raw)) return true;
    if (/[{};]/.test(raw)) return true;
    if (/\d/.test(raw) && raw.length > 6) return true;
    if (raw.length > 28 && /\s/.test(raw)) return true;
    if (!/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7a3]/.test(raw) && raw.split(/\s+/).length > 3) return true;
    return false;
  }

  function hasSpeakableConfiguredLanguage(text) {
    return hasJapanese(text) || (config.koreanTranslateTts && (hasKorean(text) || hasEnglish(text)));
  }

  function looksLikeNarrationCandidateLine(line) {
    const rawLine = String(line || "");
    if (isRisuTtsForbiddenLine(rawLine)) return false;
    if (/(?:x-risu-risutts-|data-risu-risutts-|x-risutts-|data-risutts-|risutts-action|risutts-read-all)/i.test(rawLine)) return false;
    if (/<(button|input|textarea|select|script|style|svg|canvas|audio|video)\b/i.test(rawLine)) return false;
    const text = cleanSegmentSourceText(rawLine);
    if (!text || text.length < 2 || text.length > NARRATION_LINE_MAX_CHARS) return false;
    if (looksLikeRisuNonChatUi(rawLine)) return false;
    if (looksLikeLooseSpeakerQuoteLine(rawLine)) return false;
    if (hasColonlessShortInlineQuote(text)) return false;
    if (/^[#>*\-\s]+$/.test(text)) return false;
    if (/^#{1,6}\s+\S/.test(text)) return false;
    if (/^(?:応答|response|assistant\s*response)$/i.test(text)) return false;
    if (/^(?:巻|章)\s*\d+\s*[:：]/i.test(text)) return false;
    if (/^(?:chat\s*index|chatindex)\s*[:：]/i.test(text)) return false;
    if (/[∮∯]/.test(text) && /(?:chat\s*index|chatindex|^\s*#{1,6})/i.test(text)) return false;
    return Boolean(getSegmentMode(text));
  }

  function looksLikeRpSpeakableContent(html) {
    const input = String(html || "");
    if (!input) return false;
    if (input.length <= 8192) {
      const speakKey = hashText(input) + "|" + (config.globalNarrationEnabled ? "1" : "0") + "|" + (config.koreanTranslateTts ? "1" : "0");
      const cached = speakableCheckCache.get(speakKey);
      if (cached != null) return cached;
      const result = looksLikeRpSpeakableContentUncached(input);
      if (speakableCheckCache.size >= SPEAKABLE_CHECK_CACHE_MAX) {
        const firstKey = speakableCheckCache.keys().next().value;
        if (firstKey) speakableCheckCache.delete(firstKey);
      }
      speakableCheckCache.set(speakKey, result);
      return result;
    }
    return looksLikeRpSpeakableContentUncached(input);
  }
  function looksLikeRpSpeakableContentUncached(html) {
    const text = stripInlineHtmlPreserveLines(stripRisuThoughtBlocks(html));
    if (!text || looksLikeRisuNonChatUi(text)) return false;
    if (isNumberedUiList(text)) return false;
    const speakableLines = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !isRisuTtsForbiddenLine(line));
    if (!speakableLines.length) return false;
    const speakableText = speakableLines.join("\n");
    if (!hasSpeakableConfiguredLanguage(speakableText)) return false;
    if (hasDialogueQuote(speakableText)) return true;
    if (speakableLines
      .some((line) => startsWithDialogueQuote(line))) return true;
    if (config.globalNarrationEnabled && speakableLines
      .some((line) => looksLikeNarrationCandidateLine(line))) return true;
    return speakableLines
      .some((line) => Boolean(parseSpeakerLine(line)));
  }

  function describeRpSpeakableContent(html) {
    const text = stripInlineHtmlPreserveLines(stripRisuThoughtBlocks(html));
    if (!text) return { reason: "empty-after-html-strip" };
    if (looksLikeRisuNonChatUi(text)) return { reason: "non-chat-ui-after-html-strip" };
    if (isNumberedUiList(text)) return { reason: "numbered-ui-list" };
    const allLines = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const speakableLines = allLines
      .filter((line) => !isRisuTtsForbiddenLine(line));
    const speakableText = speakableLines.join("\n");
    const language = {
      hasJapanese: hasJapanese(speakableText),
      hasKorean: hasKorean(speakableText),
      hasEnglish: hasEnglish(speakableText),
      koreanTranslateTts: Boolean(config.koreanTranslateTts),
      configured: Boolean(hasSpeakableConfiguredLanguage(speakableText)),
    };
    if (!speakableLines.length) {
      return {
        reason: "no-speakable-lines",
        lineCount: allLines.length,
        language,
      };
    }
    const quote = {
      hasDialogueQuote: hasDialogueQuote(speakableText),
      startsWithDialogueQuote: speakableLines.some((line) => startsWithDialogueQuote(line)),
    };
    const narrationCandidate = Boolean(config.globalNarrationEnabled && speakableLines
      .some((line) => looksLikeNarrationCandidateLine(line)));
    const speakerLine = speakableLines
      .some((line) => Boolean(parseSpeakerLine(line)));
    return {
      reason: language.configured ? "no-supported-segment-pattern" : "language-not-enabled",
      lineCount: allLines.length,
      speakableLineCount: speakableLines.length,
      language,
      quote,
      globalNarrationEnabled: Boolean(config.globalNarrationEnabled),
      narrationCandidate,
      speakerLine,
      sampleLines: speakableLines.slice(0, 3),
    };
  }

  function cleanSpeakerName(value) {
    return normalizeLoreCandidateName(stripInlineHtml(value))
      .replace(/^[\s\u200d\ufe0f\u2600-\u27bf\ud83c-\udfff]+/g, "")
      .replace(/^[^\w\u3040-\u30ff\u3400-\u9fff\uac00-\ud7a3]+/g, "")
      .replace(/\s*(?:さん|様|さま|くん|君|ちゃん|殿|氏|先生|선생님|님|씨)\s*$/i, "")
      .trim();
  }

  function parseSpeakerLine(line) {
    if (isRisuTtsForbiddenLine(line)) return null;
    const rawLine = String(line || "");
    const cueMatch = rawLine.match(/^(\s*(?:<[^>]+>\s*)*)((?:👩|👨|⚡️?|🤖|🐕|👻|💀)\s*)([^:：<>\n]{1,40})([:：]\s*)([\s\S]{2,700})$/u);
    if (cueMatch) {
      if (!hasSpeakerCueEmoji(cueMatch[2])) return null;
      if (isLikelyInvalidExplicitCueSpeakerPrefix(cueMatch[3])) return null;
      const { speakerName, matched } = explicitCueSpeakerMatchInfo(cueMatch[3]);
      if (!isValidCueSpeakerName(cueMatch[3]) && !matched) return null;
      if (!speakerName) return null;
      return {
        prefix: `${cueMatch[1]}${cueMatch[2]}${cueMatch[3]}${cueMatch[4]}`,
        speakerCueGender: speakerCueGenderFromEmoji(cueMatch[2]),
        speakerName,
        rest: cueMatch[5],
      };
    }

    const looseMatch = rawLine.match(/^(\s*(?:<[^>]+>\s*)*)([^:：<>\n]{1,40})([:：]\s*)([「“"][\s\S]{2,700})$/u);
    if (!looseMatch) return null;
    if (isLikelyUiListSpeakerPrefix(looseMatch[2])) return null;
    const { speakerName, matched } = speakerPrefixMatchInfo(looseMatch[2]);
    if (!speakerName || !matched) return null;
    return {
      prefix: `${looseMatch[1]}${looseMatch[2]}${looseMatch[3]}`,
      speakerCueGender: "",
      speakerName,
      rest: looseMatch[4],
    };
  }

  function speakerCueGenderFromEmoji(value) {
    const text = String(value || "");
    if (text.includes("👩")) return "female";
    if (text.includes("👨")) return "male";
    if (/(?:⚡️?|🤖|🐕|👻|💀)/u.test(text)) return "neutral";
    return "";
  }

  function stripSpeakerCueWrappingQuotes(value) {
    const text = String(value || "").trim();
    const quotePairs = [
      ['"', '"'],
      ["'", "'"],
      ["“", "”"],
      ["「", "」"],
    ];
    for (const [open, close] of quotePairs) {
      if (text.startsWith(open) && text.endsWith(close) && text.length > open.length + close.length) {
        return text.slice(open.length, text.length - close.length).trim();
      }
    }
    return text;
  }

  function createPayload(sourceText, mode, contentHash, segmentIndex, options = {}) {
    const voiceSeed = getVoiceSeedForHash();
    const speakerName = options.speakerName || "";
    const segmentKind = options.segmentKind || "line";
    const speakerCueGender = options.speakerCueGender || "";
    const id = `rt_${hashText(`${contentHash}|${segmentIndex}|${mode}|${sourceText}|${speakerName}|${speakerCueGender}|${segmentKind}|${voiceSeed}`)}`;
    payloads.set(id, {
      id,
      mode,
      sourceText,
      contentHash,
      segmentIndex,
      speakerName,
      speakerCueGender,
      segmentKind,
      createdAt: Date.now(),
    });
    return id;
  }

  function rememberContentSegments(contentHash, segments) {
    if (!contentHash || !Array.isArray(segments)) return;
    const cleaned = segments
      .filter((segment) => segment && segment.text)
      .slice(0, 80)
      .map((segment) => ({
        index: Number(segment.index || 0),
        payloadId: segment.payloadId || "",
        mode: segment.mode || "",
        text: String(segment.text || "").slice(0, 700),
        speakerName: segment.speakerName || "",
        speakerCueGender: segment.speakerCueGender || "",
        segmentKind: segment.segmentKind || "line",
      }));
    if (!cleaned.length) return;
    contentSegmentsByHash.set(contentHash, cleaned);
    if (contentSegmentsByHash.size > 160) {
      const firstKey = contentSegmentsByHash.keys().next().value;
      if (firstKey) contentSegmentsByHash.delete(firstKey);
    }
  }

  function getVoiceSeedForHash() {
    return [
      config.defaultVoice,
      config.ttsModel,
      config.responseFormat,
      config.numSteps,
      config.cfgScaleText,
      config.cfgScaleSpeaker,
      config.speed,
      config.globalNarrationEnabled,
    ].join("|");
  }

  function decoratedContentCacheKey(contentHash) {
    return [
      contentHash || "",
      lastKnownCharacterId || "global",
      config.koreanTranslateTts ? "ko-en-on" : "ko-en-off",
      config.globalNarrationEnabled ? "global-on" : "global-off",
      config.readAllButtonEnabled !== false ? "read-all-on" : "read-all-off",
      `long-button-limit-${config.longMessageSpeakerButtonLimit}`,
    ].join("|");
  }

function clearDecoratedContentCache() {
  decoratedContentCache.clear();
  decoratedContentCacheHitCount = 0;
  lastDecoratedContentCacheHitLogAt = 0;
  if (typeof stripRisuTtsControlsCache !== "undefined" && stripRisuTtsControlsCache) stripRisuTtsControlsCache.clear();
  if (typeof stripInlineHtmlCache !== "undefined" && stripInlineHtmlCache) stripInlineHtmlCache.clear();
  if (typeof parsedSegmentsCache !== "undefined" && parsedSegmentsCache) parsedSegmentsCache.clear();
  if (typeof speakableCheckCache !== "undefined" && speakableCheckCache) speakableCheckCache.clear();
  if (typeof speakerMatchCacheByBot !== "undefined" && speakerMatchCacheByBot) speakerMatchCacheByBot.clear();
  overlayButtonPlaceCache = { ts: 0, sig: "", map: new Map() };
}

  function rememberDecoratedContent(cacheKey, entry) {
    if (!cacheKey || !entry?.output) return;
    decoratedContentCache.delete(cacheKey);
    decoratedContentCache.set(cacheKey, entry);
    while (decoratedContentCache.size > DECORATED_CONTENT_CACHE_MAX) {
      const firstKey = decoratedContentCache.keys().next().value;
      if (!firstKey) break;
      decoratedContentCache.delete(firstKey);
    }
  }

  function recordDecoratedContentCacheHit(contentHash, contentLength) {
    decoratedContentCacheHitCount += 1;
    const now = Date.now();
    if (now - lastDecoratedContentCacheHitLogAt < 5000) return;
    lastDecoratedContentCacheHitLogAt = now;
    addRuntimeLog("표시 단계 TTS 캐시 재사용", {
      contentHash,
      contentLength,
      cacheSize: decoratedContentCache.size,
      hits: decoratedContentCacheHitCount,
    });
  }

  function renderButton(payloadId, mode, sourceText, contentHash, segmentIndex, options = {}) {
    const label = htmlEscape(chatButtonLabel(mode, "idle"));
    const preview = buttonVoicePreview(options, options.previewCache);
    const color = normalizeVoiceColor(preview?.color || "");
    const titleBase = mode === "ja"
      ? "Play this Japanese line with RisuTTS"
      : `Translate this ${sourceLanguageLabel(mode)} line to Japanese and play it with RisuTTS`;
    const buttonTitle = preview
      ? `${titleBase} / ${preview.characterName} / voice: ${preview.voice}`
      : titleBase;
    const escapedPayloadId = htmlEscape(payloadId);
    const escapedMode = htmlEscape(mode);
    const escapedContentHash = htmlEscape(contentHash);
    const escapedSegmentIndex = htmlEscape(segmentIndex);
    const escapedTitle = htmlEscape(buttonTitle);
    const renderedLabel = chatButtonLabelWithColor(label, color);
    const payloadClass = `risutts-payload-${payloadId}`;
    const risuPayloadClass = `x-risu-risutts-payload-${payloadId}`;
    return [
      `<span class="risutts-wrap">`,
      `<button type="button" class="risutts-action x-risu-risutts-action ${payloadClass} ${risuPayloadClass}" name="risutts-action" value="${escapedPayloadId}" aria-label="${escapedTitle}" x-risutts-id="${escapedPayloadId}" data-risutts-id="${escapedPayloadId}" x-risu-risutts-id="${escapedPayloadId}" data-risu-risutts-id="${escapedPayloadId}" data-risutts-mode="${escapedMode}" data-risutts-content="${escapedContentHash}" data-risutts-segment="${escapedSegmentIndex}" title="${escapedTitle}">`,
      renderedLabel,
      `<span class="risutts-payload-token" hidden>${escapedPayloadId}</span>`,
      "</button>",
      "</span>",
    ].join("");
  }

  function moreSpeakerButtonInlineStyle(visible = true) {
    return [
      visible ? "display:inline-flex !important" : "display:none !important",
      "align-items:center",
      "justify-content:center",
      "height:24px !important",
      "min-height:24px !important",
      "max-height:24px !important",
      "min-width:38px !important",
      "box-sizing:border-box",
      "margin:0 4px",
      "padding:0 8px",
      "border:1px solid rgba(148,163,184,0.5)",
      "border-radius:999px",
      "background:rgba(15,23,42,0.18)",
      "color:#dbeafe",
      "font-size:12px",
      "line-height:1",
      "vertical-align:middle",
      "position:relative",
      "z-index:4",
      "pointer-events:auto",
      "cursor:pointer",
    ].join(";");
  }

  function renderMoreSpeakerButtonHtml(contentHash, batchIndex, batchSize, visible = false) {
    const safeBatch = Math.max(1, Math.floor(Number(batchIndex) || 1));
    const safeBatchSize = Math.max(1, Math.floor(Number(batchSize) || LONG_MESSAGE_SPEAKER_BUTTON_LIMIT_DEFAULT));
    const escapedHash = htmlEscape(contentHash);
    const classToken = htmlEscape(readAllClassToken(contentHash));
    const label = htmlEscape(`+${safeBatchSize}`);
    const title = htmlEscape(`RisuTTS 개별 스피커 다음 ${safeBatchSize}개 표시`);
    return [
      `<button type="button" class="risutts-more-speakers x-risu-risutts-more-speakers risutts-more-${classToken}-${safeBatch}" name="risutts-more-speakers" value="${escapedHash}:${safeBatch}" aria-label="${title}" title="${title}" data-risutts-more-role="speaker-more" data-risu-risutts-more-role="speaker-more" data-risutts-more-content="${escapedHash}" data-risu-risutts-more-content="${escapedHash}" data-risutts-more-batch="${safeBatch}" data-risu-risutts-more-batch="${safeBatch}" style="${moreSpeakerButtonInlineStyle(visible)}">`,
      label,
      "</button>",
    ].join("");
  }

  function renderDeferredSpeakerSlotHtml(payloadId, contentHash, batchIndex, segmentIndex) {
    const escapedPayloadId = htmlEscape(payloadId);
    const escapedHash = htmlEscape(contentHash);
    const classToken = htmlEscape(readAllClassToken(contentHash));
    const safeBatch = htmlEscape(Math.max(1, Math.floor(Number(batchIndex) || 1)));
    const safeSegmentIndex = htmlEscape(segmentIndex);
    return `<span class="risutts-deferred-speaker x-risu-risutts-deferred-speaker risutts-deferred-${classToken}-${safeBatch} risutts-deferred-payload-${escapedPayloadId}" data-risutts-more-content="${escapedHash}" data-risu-risutts-more-content="${escapedHash}" data-risutts-more-batch="${safeBatch}" data-risu-risutts-more-batch="${safeBatch}" data-risutts-more-payload="${escapedPayloadId}" data-risu-risutts-more-payload="${escapedPayloadId}" data-risutts-more-segment="${safeSegmentIndex}" data-risu-risutts-more-segment="${safeSegmentIndex}" data-risutts-more-revealed="false"></span>`;
  }

  function readAllClassToken(contentHash) {
    return String(contentHash || "")
      .replace(/[^a-z0-9_-]/gi, "_")
      .slice(0, 80) || "unknown";
  }

  function readAllButtonInlineStyle(state = "idle") {
    const busy = state === "busy";
    return [
      "display:inline-flex !important",
      "align-items:center",
      "justify-content:center",
      "width:28px !important",
      "height:28px !important",
      "min-width:28px !important",
      "max-width:28px !important",
      "min-height:28px !important",
      "max-height:28px !important",
      "flex:0 0 28px !important",
      "align-self:flex-start !important",
      "box-sizing:border-box",
      "overflow:hidden",
      "position:relative",
      "margin:0 4px",
      "padding:0",
      "border:1px solid rgba(148,163,184,0.55)",
      "border-radius:999px",
      busy ? "background:rgba(37,99,235,0.24)" : "background:rgba(15,23,42,0.22)",
      busy ? "color:#bfdbfe" : "color:#e5edf9",
      "font-size:14px",
      "line-height:1",
      "vertical-align:middle",
      "position:relative",
      "z-index:5",
      "pointer-events:auto",
      "cursor:pointer",
    ].join(";");
  }

  async function readAllButtonStyleForState(_button, state = "idle") {
    return readAllButtonInlineStyle(state);
  }

  function renderReadAllButtonHtml(contentHash, placement = READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP) {
    const escapedHash = htmlEscape(contentHash);
    const classToken = htmlEscape(readAllClassToken(contentHash));
    const safePlacement = htmlEscape(readAllPlacementMatchesConfig(placement)
      ? placement
      : READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP);
    return [
      `<button type="button" class="risutts-read-all x-risu-risutts-read-all risutts-read-all-${classToken} x-risu-risutts-read-all-${classToken}" name="risutts-read-all" value="${escapedHash}" aria-label="RisuTTS 전체 읽기" title="RisuTTS 전체 읽기" data-risutts-role="read-all" data-risu-risutts-role="read-all" x-risutts-read-all="${escapedHash}" data-risutts-read-all="${escapedHash}" x-risu-risutts-read-all="${escapedHash}" data-risu-risutts-read-all="${escapedHash}" x-risutts-content="${escapedHash}" data-risutts-content="${escapedHash}" x-risu-risutts-content="${escapedHash}" data-risu-risutts-content="${escapedHash}" x-risutts-read-all-placement="${safePlacement}" data-risutts-read-all-placement="${safePlacement}" x-risu-risutts-read-all-placement="${safePlacement}" data-risu-risutts-read-all-placement="${safePlacement}" style="${readAllButtonInlineStyle("idle")}">`,
      RISUTTS_READ_ALL_ICON,
      "</button>",
    ].join("");
  }

  function configuredReadAllButtonPlacement() {
    return READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP;
  }

  function readAllPlacementMatchesConfig(placement) {
    const actual = String(placement || READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP).toLowerCase();
    return actual === READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP;
  }

  function chatButtonLabel(mode, state) {
    if (state === "error") return "!";
    return "🔊";
  }

  function inlineSpeakerButtonLimitForContent(contentLength) {
    const configured = Number(config.longMessageSpeakerButtonLimit);
    if (!Number.isFinite(configured) || configured <= 0) return Infinity;
    if (Number(contentLength || 0) <= LONG_MESSAGE_BUTTON_LIMIT_THRESHOLD_CHARS) return Infinity;
    return Math.max(1, Math.floor(configured));
  }

  function sourceLanguageLabel(mode) {
    if (mode === "ko") return "Korean";
    if (mode === "en") return "English";
    return "source";
  }

  function setDecorateSkipSummary(runId, reason, rawContent, cleanedContent = "", extra = {}) {
    const contentForLog = cleanedContent || rawContent || "";
    lastDecorateSkipSummary = {
      runId,
      reason,
      rawLength: String(rawContent || "").length,
      cleanedLength: String(cleanedContent || "").length,
      contentHash: hashText(contentForLog),
      hasJapanese: hasJapanese(contentForLog),
      hasKorean: hasKorean(contentForLog),
      hasEnglish: hasEnglish(contentForLog),
      koreanTranslateTts: Boolean(config.koreanTranslateTts),
      globalNarrationEnabled: Boolean(config.globalNarrationEnabled),
      sample: decorateLogSample(contentForLog),
      ...extra,
    };
  }

  function shouldLogDecorateSkip(summary) {
    if (!summary) return false;
    const key = [
      summary.reason || "",
      summary.contentHash || "",
      summary.rawLength || 0,
      summary.cleanedLength || 0,
    ].join(":");
    const now = monotonicNow();
    if (key === lastDecorateSkipLogKey && now - lastDecorateSkipLogAt < DISPLAY_SKIP_LOG_COOLDOWN_MS) {
      return false;
    }
    lastDecorateSkipLogKey = key;
    lastDecorateSkipLogAt = now;
    return true;
  }

  async function getElementAttribute(element, ...names) {
    for (const name of names) {
      if (!name) continue;
      try {
        const value = await element.getAttribute(name);
        if (value != null && value !== "") return value;
      } catch {
        // Some SafeElement wrappers reject specific attributes. Try the next alias.
      }
    }
    return null;
  }

  async function setElementStyleAttribute(element, styleText) {
    if (!element) return false;
    try {
      if (typeof element.setStyleAttribute === "function") {
        await element.setStyleAttribute(String(styleText || ""));
        return true;
      }
    } catch {
      // Fall back to setStyle when the full style attribute is blocked.
    }
    try {
      if (typeof element.setStyle === "function") {
        const rules = String(styleText || "")
          .split(";")
          .map((rule) => rule.trim())
          .filter(Boolean);
        for (const rule of rules) {
          const index = rule.indexOf(":");
          if (index <= 0) continue;
          const key = rule.slice(0, index).trim();
          const value = rule.slice(index + 1).trim();
          if (key) await element.setStyle(key, value).catch(() => {});
        }
        return true;
      }
    } catch {
      // No style setter available.
    }
    return false;
  }

  async function getElementStyleAttribute(element) {
    if (!element) return "";
    try {
      if (typeof element.getStyleAttribute === "function") {
        return await element.getStyleAttribute();
      }
    } catch {
      // Fall through to individual style probes.
    }
    try {
      if (typeof element.getStyle === "function") {
        const display = await element.getStyle("display").catch(() => "");
        return display ? `display:${display}` : "";
      }
    } catch {
      // Some wrappers may expose neither style getter.
    }
    return "";
  }

  function payloadIdFromClassName(className) {
    const match = String(className || "").match(/\brisutts-payload-(rt_[a-z0-9]+)\b/i);
    return match ? match[1] : "";
  }

  function payloadIdFromHtml(value) {
    const text = String(value || "");
    return payloadIdFromClassName(text)
      || (text.match(/(?:x-risutts-id|data-risutts-id|value|aria-label|name)["'\s:=]+(?:[^"']*?\s)?(rt_[a-z0-9]+)/i)?.[1] || "")
      || (text.match(/\brt_[a-z0-9]+\b/i)?.[0] || "");
  }

  function getNativeElementAttribute(element, name) {
    if (!element || !name) return "";
    try {
      if (typeof element.getAttribute === "function") {
        return element.getAttribute(name) || "";
      }
    } catch {
      // Native event targets may reject attribute reads in some wrappers.
    }
    try {
      if (name === "class") return element.className || "";
      if (name.startsWith("data-")) {
        const datasetKey = name
          .slice(5)
          .replace(/-([a-z])/g, (_match, char) => String(char || "").toUpperCase());
        return element.dataset?.[datasetKey] || "";
      }
    } catch {
      // Fall through.
    }
    return "";
  }

  function nativeSpeakerButtonFromEventTarget(event = null, payloadId = "") {
    const expectedPayloadId = payloadIdFromHtml(payloadId);
    let target = event?.target || null;
    for (let depth = 0; target && depth < 6; depth += 1) {
      const candidatePayloadId = payloadIdFromHtml([
        getNativeElementAttribute(target, "data-risutts-id"),
        getNativeElementAttribute(target, "x-risutts-id"),
        getNativeElementAttribute(target, "data-risu-risutts-id"),
        getNativeElementAttribute(target, "x-risu-risutts-id"),
        getNativeElementAttribute(target, "value"),
        getNativeElementAttribute(target, "aria-label"),
        getNativeElementAttribute(target, "class"),
      ].join(" "));
      if (
        candidatePayloadId
        && (!expectedPayloadId || candidatePayloadId === expectedPayloadId)
        && typeof target.setAttribute === "function"
      ) {
        return target;
      }
      try {
        target = target.parentElement || target.parentNode || null;
      } catch {
        target = null;
      }
    }
    return null;
  }

  async function getButtonPayloadId(button, options = {}) {
    const allowSlowFallback = options?.allowSlowFallback !== false;
    const payloadId = await getElementAttribute(
      button,
      "x-risutts-id",
      "data-risutts-id",
      "x-risu-risutts-id",
      "data-risu-risutts-id"
    );
    if (payloadId) return payloadId;
    const classPayloadId = payloadIdFromClassName(await getElementClassName(button));
    if (classPayloadId) return classPayloadId;
    const attrPayloadId = payloadIdFromHtml(await getElementAttribute(button, "value", "aria-label", "title", "name").catch(() => ""));
    if (attrPayloadId) return attrPayloadId;
    if (!allowSlowFallback) return "";
    try {
      const outerPayloadId = payloadIdFromHtml(await button.getOuterHTML());
      if (outerPayloadId) return outerPayloadId;
    } catch {
      // Some wrappers may block outerHTML. Try textContent next.
    }
    try {
      return payloadIdFromHtml(await button.textContent());
    } catch {
      return "";
    }
  }

  function contentHashFromHtml(value) {
    const text = String(value || "");
    return (text.match(/(?:x-risutts-content|data-risutts-content)["'\s:=]+([^"'\s>]+)/i)?.[1] || "")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .trim();
  }

  async function getButtonContentHash(button) {
    const direct = await getElementAttribute(button, "x-risutts-content", "data-risutts-content").catch(() => "");
    if (direct) return direct;
    const payloadId = await getButtonPayloadId(button).catch(() => "");
    if (payloadId) {
      const existing = payloads.get(payloadId);
      if (existing?.contentHash) return existing.contentHash;
      const payload = await payloadFromButton(button, payloadId).catch(() => null);
      if (payload?.contentHash) return payload.contentHash;
    }
    try {
      const outer = await button.getOuterHTML();
      const fromOuter = contentHashFromHtml(outer);
      if (fromOuter) return fromOuter;
    } catch {
      // Some wrappers may block outerHTML.
    }
    return "";
  }

  async function hasVisibleSpeakerButtonsForContentHash(contentHash) {
    if (!contentHash) return false;
    const acceptedHashes = new Set([contentHash]);
    const rememberedPayloads = readAllPayloadsByHash.get(contentHash);
    if (Array.isArray(rememberedPayloads)) {
      for (const payload of rememberedPayloads) {
        if (payload?.contentHash) acceptedHashes.add(payload.contentHash);
      }
    }
    const buttons = await collectRisuTtsButtons({ source: "visible-speaker-hash" });
    for (const button of buttons) {
      const hash = await getButtonContentHash(button).catch(() => "");
      if (!acceptedHashes.has(hash)) continue;
      const rect = await elementRect(button).catch(() => null);
      if (rect && rect.width > 0 && rect.height > 0) return true;
    }
    return false;
  }

  function payloadIdFromLooseEventValue(value, depth = 0, seen = new Set()) {
    if (value == null || depth > 3) return "";
    if (typeof value === "string") {
      return payloadIdFromHtml(value);
    }
    if (typeof value !== "object") return "";
    if (seen.has(value)) return "";
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = payloadIdFromLooseEventValue(item, depth + 1, seen);
        if (found) return found;
      }
      return "";
    }

    const direct = payloadIdFromClassName(value.targetClassName || value.className || value.target?.className || "")
      || value["x-risutts-id"]
      || value["data-risutts-id"]
      || value?.dataset?.risuttsId
      || value?.attributes?.["x-risutts-id"]
      || value?.attributes?.["data-risutts-id"]
      || value?.target?.["x-risutts-id"]
      || value?.target?.["data-risutts-id"]
      || value?.target?.dataset?.risuttsId
      || value?.target?.attributes?.["x-risutts-id"]
      || value?.target?.attributes?.["data-risutts-id"];
    if (direct) return String(direct);

    for (const key of ["target", "srcElement", "currentTarget", "path", "composedPath"]) {
      const child = value[key];
      const found = payloadIdFromLooseEventValue(typeof child === "function" ? null : child, depth + 1, seen);
      if (found) return found;
    }
    return "";
  }

  async function getEventTargetPayloadId(event) {
    const loose = payloadIdFromLooseEventValue(event);
    if (loose) return loose;

    const directClass = payloadIdFromClassName(
      event?.targetClassName
      || event?.className
      || event?.target?.className
      || ""
    );
    if (directClass) return directClass;

    let target = event?.target || null;
    for (let depth = 0; target && depth < 4; depth += 1) {
      try {
        const payloadId = await getButtonPayloadId(target);
        if (payloadId) return payloadId;
      } catch {
        // Some event targets are plain trimmed event objects, not SafeElements.
      }
      try {
        target = typeof target.getParent === "function" ? await target.getParent() : null;
      } catch {
        target = null;
      }
    }
    return "";
  }

  function readAllContentHashFromClassName(className) {
    const tokens = String(className || "").split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      const match = token.match(/^(?:x-risu-)?risutts-read-all-([a-z0-9_-]+)$/i);
      if (!match) continue;
      if (match[1].toLowerCase() === "wrap") continue;
      return match[1].replace(/_/g, "");
    }
    return "";
  }

  async function hasReadAllButtonMarker(button) {
    const [name, title, ariaLabel, role, className] = await Promise.all([
      getElementAttribute(button, "name").catch(() => ""),
      getElementAttribute(button, "title").catch(() => ""),
      getElementAttribute(button, "aria-label").catch(() => ""),
      getElementAttribute(button, "data-risutts-role", "data-risu-risutts-role").catch(() => ""),
      getElementClassName(button).catch(() => ""),
    ]);
    if (String(name || "").toLowerCase() === "risutts-read-all") return true;
    if (String(role || "").toLowerCase() === "read-all") return true;
    const classTokens = String(className || "").split(/\s+/).filter(Boolean);
    if (classTokens.includes("risutts-read-all") || classTokens.includes("x-risu-risutts-read-all")) return true;
    return /RisuTTS\s*전체\s*읽기/i.test(String(title || ""))
      || /RisuTTS\s*전체\s*읽기/i.test(String(ariaLabel || ""));
  }

  async function getReadAllContentHash(button) {
    const contentHash = await getElementAttribute(
      button,
      "x-risutts-read-all",
      "data-risutts-read-all",
      "x-risu-risutts-read-all",
      "data-risu-risutts-read-all"
    );
    if (contentHash) return contentHash;
    const classHash = readAllContentHashFromClassName(await getElementClassName(button));
    if (classHash) return classHash;
    if (await hasReadAllButtonMarker(button).catch(() => false)) {
      return await getElementAttribute(
        button,
        "value",
        "x-risutts-content",
        "data-risutts-content",
        "x-risu-risutts-content",
        "data-risu-risutts-content"
      ).catch(() => "") || "";
    }
    return "";
  }

  function readAllHashesMatch(left, right) {
    const a = String(left || "");
    const b = String(right || "");
    if (!a || !b) return false;
    return a === b || readAllClassToken(a) === readAllClassToken(b);
  }

  async function getEventTargetReadAllContentHash(event) {
    let target = event?.target || null;
    for (let depth = 0; target && depth < 8; depth += 1) {
      try {
        const contentHash = await getReadAllContentHash(target);
        if (contentHash) return contentHash;
      } catch {
        // Some event targets are plain event objects, not SafeElements.
      }
      try {
        target = typeof target.getParent === "function" ? await target.getParent() : null;
      } catch {
        target = null;
      }
    }
    return "";
  }

  async function findReadAllButtonFromEventTarget(event) {
    let target = event?.target || null;
    for (let depth = 0; target && depth < 8; depth += 1) {
      try {
        if (await isRisuTtsReadAllButton(target).catch(() => false)) return target;
      } catch {
        // Some event targets are plain event objects, not SafeElements.
      }
      try {
        if (typeof target.getParent === "function") {
          target = await target.getParent();
        } else {
          target = target.parentElement || target.parentNode || null;
        }
      } catch {
        target = null;
      }
    }
    return null;
  }

  function finiteEventNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function eventPointerPoint(event) {
    const candidates = [
      [event?.clientX, event?.clientY],
      [event?.x, event?.y],
      [event?.pageX, event?.pageY],
      [event?.target?.clientX, event?.target?.clientY],
      [event?.nativeEvent?.clientX, event?.nativeEvent?.clientY],
    ];
    for (const [rawX, rawY] of candidates) {
      const x = finiteEventNumber(rawX);
      const y = finiteEventNumber(rawY);
      if (x != null && y != null) return { x, y };
    }
    return null;
  }

  function rememberMainDomEventPoint(event) {
    const point = eventPointerPoint(event);
    if (!point) return;
    lastMainDomEventPoint = {
      x: point.x,
      y: point.y,
      at: Date.now(),
    };
  }

  function recentMainDomEventPoint(maxAgeMs = 350) {
    if (!lastMainDomEventPoint) return null;
    const ageMs = Date.now() - Number(lastMainDomEventPoint.at || 0);
    if (ageMs < 0 || ageMs > maxAgeMs) return null;
    return {
      x: lastMainDomEventPoint.x,
      y: lastMainDomEventPoint.y,
    };
  }

  function readAllDirectEventPoint(event) {
    return eventPointerPoint(event) || recentMainDomEventPoint();
  }

  function rememberMoreSpeakersEventPoint(event, contentHash = "", batchIndex = 0) {
    const point = eventPointerPoint(event);
    if (!point) return;
    lastMoreSpeakersEventPoint = {
      x: point.x,
      y: point.y,
      at: Date.now(),
      contentHash: String(contentHash || ""),
      batchIndex: Number(batchIndex || 0),
    };
  }

  function shouldSuppressMoreSpeakersFollowupEvent(event) {
    if (!lastMoreSpeakersEventPoint) return false;
    const point = eventPointerPoint(event);
    if (!point) return false;
    const ageMs = Date.now() - Number(lastMoreSpeakersEventPoint.at || 0);
    if (ageMs < 0 || ageMs > MORE_SPEAKER_FOLLOWUP_SUPPRESS_MS) return false;
    return Math.abs(point.x - lastMoreSpeakersEventPoint.x) <= 6
      && Math.abs(point.y - lastMoreSpeakersEventPoint.y) <= 6;
  }

  function rememberMoreSpeakersRevealedPayloads(contentHash, batchIndex, payloadIds = []) {
    const ids = (Array.isArray(payloadIds) ? payloadIds : [])
      .map((id) => payloadIdFromHtml(id) || String(id || "").trim())
      .filter(Boolean);
    if (!ids.length) return;
    lastMoreSpeakersReveal = {
      at: Date.now(),
      contentHash: String(contentHash || ""),
      batchIndex: Number(batchIndex || 0),
      payloadIds: new Set(ids),
    };
  }

  function shouldSuppressRecentlyRevealedSpeakerPayload(payloadId) {
    const id = payloadIdFromHtml(payloadId) || String(payloadId || "").trim();
    if (!id || !lastMoreSpeakersReveal?.payloadIds?.has(id)) return false;
    const ageMs = Date.now() - Number(lastMoreSpeakersReveal.at || 0);
    return ageMs >= 0 && ageMs <= MORE_SPEAKER_REVEALED_CLICK_SUPPRESS_MS;
  }

  async function eventPointInsideElement(event, element, padSize = 4) {
    const point = eventPointerPoint(event);
    if (!point || !element) return null;
    try {
      const rect = await element.getBoundingClientRect();
      const left = finiteEventNumber(rect?.left ?? rect?.x);
      const top = finiteEventNumber(rect?.top ?? rect?.y);
      const right = finiteEventNumber(rect?.right) ?? (left != null ? left + Number(rect?.width || 0) : null);
      const bottom = finiteEventNumber(rect?.bottom) ?? (top != null ? top + Number(rect?.height || 0) : null);
      if (left == null || top == null || right == null || bottom == null) return null;
      const pad = Number.isFinite(Number(padSize)) ? Number(padSize) : 4;
      return point.x >= left - pad && point.x <= right + pad && point.y >= top - pad && point.y <= bottom + pad;
    } catch {
      return null;
    }
  }

  function pointInsideViewportRect(point, rect, padSize = 4) {
    if (!point || !isRenderableViewportRect(rect)) return false;
    const pad = Number.isFinite(Number(padSize)) ? Number(padSize) : 4;
    return point.x >= rect.left - pad
      && point.x <= rect.right + pad
      && point.y >= rect.top - pad
      && point.y <= rect.bottom + pad;
  }

  function roundedRectValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : 0;
  }

  function visibleSpeakerCandidateKey(payloadId, rect) {
    if (!payloadId || !isRenderableViewportRect(rect)) return "";
    return [
      payloadId,
      roundedRectValue(rect.left),
      roundedRectValue(rect.top),
      roundedRectValue(rect.width),
      roundedRectValue(rect.height),
    ].join(":");
  }

  function acceptSpeakerClickEvent(event, payloadId) {
    if (!event || !payloadId) return true;
    const point = eventPointerPoint(event);
    const pointKey = point ? `${roundedRectValue(point.x)}:${roundedRectValue(point.y)}` : "nopoint";
    const timeBucket = Math.floor(Date.now() / 900);
    const token = `${payloadId}:${pointKey}:${timeBucket}`;
    const now = Date.now();
    for (const [key, at] of speakerClickEventTokens.entries()) {
      if (now - at > 3000) speakerClickEventTokens.delete(key);
    }
    const last = speakerClickEventTokens.get(token) || 0;
    if (now - last < 900) return false;
    speakerClickEventTokens.set(token, now);
    return true;
  }

  function acceptReadAllDirectButtonEvent(event, contentHash, point = null) {
    if (!event || !contentHash) return true;
    const safePoint = point || eventPointerPoint(event);
    const pointKey = safePoint ? `${roundedRectValue(safePoint.x)}:${roundedRectValue(safePoint.y)}` : "nopoint";
    const token = `${contentHash}:${pointKey}`;
    const now = Date.now();
    for (const [key, at] of readAllDirectEventTimes.entries()) {
      if (now - at > 3000) readAllDirectEventTimes.delete(key);
    }
    const last = readAllDirectEventTimes.get(token) || 0;
    if (now - last < 450) return false;
    readAllDirectEventTimes.set(token, now);
    return true;
  }

  async function pointInsideReadAllButton(point, button) {
    if (!point || !button) return null;
    const rect = await elementRect(button).catch(() => null);
    if (!isRenderableViewportRect(rect)) return null;
    const pad = 4;
    const hitWidth = Math.min(Math.max(rect.width, 0), 44);
    const hitHeight = Math.min(Math.max(rect.height, 0), 44);
    if (hitWidth <= 0 || hitHeight <= 0) return false;
    return point.x >= rect.left - pad
      && point.x <= rect.left + hitWidth + pad
      && point.y >= rect.top - pad
      && point.y <= rect.top + hitHeight + pad;
  }

  async function eventPointInsideReadAllButton(event, button) {
    return pointInsideReadAllButton(eventPointerPoint(event), button);
  }

  function consumeDomEvent(event) {
    if (!event) return;
    try {
      if (typeof event.preventDefault === "function") event.preventDefault();
    } catch {
      // Some RisuAI SafeEvent wrappers expose no native cancel methods.
    }
    try {
      if (typeof event.stopPropagation === "function") event.stopPropagation();
    } catch {
      // Same as above.
    }
    try {
      event.cancelBubble = true;
    } catch {
      // Read-only event objects are fine.
    }
  }

  async function isMoreSpeakersButton(element) {
    if (!element) return false;
    const [role, name, className] = await Promise.all([
      getElementAttribute(element, "data-risutts-more-role", "data-risu-risutts-more-role").catch(() => ""),
      getElementAttribute(element, "name").catch(() => ""),
      getElementClassName(element).catch(() => ""),
    ]);
    return String(role || "").toLowerCase() === "speaker-more"
      || String(name || "").toLowerCase() === "risutts-more-speakers"
      || /\brisutts-more-speakers\b/.test(String(className || ""));
  }

  async function findMoreSpeakersButtonFromEventTarget(event = null) {
    let target = event?.target || null;
    for (let depth = 0; target && depth < 8; depth += 1) {
      try {
        if (await isMoreSpeakersButton(target).catch(() => false)) return target;
      } catch {
        // Some event targets are plain event objects, not SafeElements.
      }
      try {
        if (typeof target.getParent === "function") {
          target = await target.getParent();
        } else {
          target = target.parentElement || target.parentNode || null;
        }
      } catch {
        target = null;
      }
    }
    return null;
  }

  async function findMoreSpeakersButtonFromEventPoint(event = null) {
    const point = eventPointerPoint(event);
    if (!point || !rootDoc || typeof rootDoc.elementFromPoint !== "function") return null;
    let target = null;
    try {
      target = await rootDoc.elementFromPoint(point.x, point.y);
    } catch {
      target = null;
    }
    for (let depth = 0; target && depth < 8; depth += 1) {
      try {
        if (await isMoreSpeakersButton(target).catch(() => false)) return target;
      } catch {
        // Some wrappers reject attribute reads on intermediate nodes.
      }
      try {
        if (typeof target.getParent === "function") {
          target = await target.getParent();
        } else {
          target = target.parentElement || target.parentNode || null;
        }
      } catch {
        target = null;
      }
    }
    return null;
  }

  async function getMoreSpeakersButtonContentHash(button) {
    const direct = await getElementAttribute(
      button,
      "data-risutts-more-content",
      "data-risu-risutts-more-content"
    ).catch(() => "") || "";
    if (direct) return direct;
    const value = await getElementAttribute(button, "value").catch(() => "") || "";
    const valueHash = String(value || "").split(":")[0] || "";
    if (valueHash) return valueHash;
    const className = await getElementClassName(button).catch(() => "");
    const classHash = String(className || "").match(/\brisutts-more-([a-z0-9_-]+)-\d+\b/i)?.[1] || "";
    return classHash ? classHash.replace(/_/g, "") : "";
  }

  async function getMoreSpeakersButtonBatch(button) {
    const raw = await getElementAttribute(
      button,
      "data-risutts-more-batch",
      "data-risu-risutts-more-batch"
    ).catch(() => "");
    const batch = Math.floor(Number(raw));
    if (Number.isFinite(batch) && batch > 0) return batch;
    const value = await getElementAttribute(button, "value").catch(() => "") || "";
    const valueBatch = Math.floor(Number(String(value || "").split(":")[1] || 0));
    if (Number.isFinite(valueBatch) && valueBatch > 0) return valueBatch;
    const className = await getElementClassName(button).catch(() => "");
    const classBatch = Math.floor(Number(String(className || "").match(/\brisutts-more-[a-z0-9_-]+-(\d+)\b/i)?.[1] || 0));
    return Number.isFinite(classBatch) && classBatch > 0 ? classBatch : 0;
  }

  function acceptMoreSpeakersEvent(event, contentHash, batchIndex) {
    if (!contentHash || !batchIndex) return false;
    const point = eventPointerPoint(event);
    const pointKey = point ? `${roundedRectValue(point.x)}:${roundedRectValue(point.y)}` : "nopoint";
    const token = `${contentHash}:${batchIndex}:${pointKey}`;
    const now = Date.now();
    for (const [key, at] of moreSpeakerEventTimes.entries()) {
      if (now - at > 3000) moreSpeakerEventTimes.delete(key);
    }
    const last = moreSpeakerEventTimes.get(token) || 0;
    if (now - last < 900) return false;
    moreSpeakerEventTimes.set(token, now);
    return true;
  }

  async function setMoreSpeakersButtonVisible(button, visible) {
    if (!button) return;
    await setElementStyleAttribute(button, moreSpeakerButtonInlineStyle(Boolean(visible))).catch(() => {});
    await button.setAttribute("data-risutts-more-visible", visible ? "true" : "false").catch(() => {});
    await button.setAttribute("data-risu-risutts-more-visible", visible ? "true" : "false").catch(() => {});
    await button.setAttribute("aria-disabled", visible ? "false" : "true").catch(() => {});
  }

  async function queryRootElements(selectors) {
    if (!rootDoc) return [];
    const result = [];
    const seen = new Set();
    for (const selector of selectors) {
      let elements = [];
      try {
        if (typeof rootDoc.querySelectorAll === "function") {
          elements = await api.unwarpSafeArray(await rootDoc.querySelectorAll(selector));
        }
        if (!elements.length) {
          const element = await rootDoc.querySelector(selector);
          if (element) elements = [element];
        }
      } catch {
        elements = [];
      }
      for (const element of elements) {
        if (!element || seen.has(element)) continue;
        seen.add(element);
        result.push(element);
      }
    }
    return result;
  }

  async function deferredSpeakerSlotsForBatch(contentHash, batchIndex) {
    if (!contentHash || !batchIndex) return [];
    const safeHash = String(contentHash || "").replace(/[^a-z0-9_-]/gi, "");
    const safeBatch = String(Math.max(1, Math.floor(Number(batchIndex) || 1)));
    return queryRootElements([
      `.risutts-deferred-speaker[data-risutts-more-content="${safeHash}"][data-risutts-more-batch="${safeBatch}"]`,
      `[data-risutts-more-payload][data-risutts-more-content="${safeHash}"][data-risutts-more-batch="${safeBatch}"]`,
      `.risutts-deferred-${readAllClassToken(safeHash)}-${safeBatch}`,
    ]);
  }

  async function moreSpeakersButtonForBatch(contentHash, batchIndex) {
    if (!contentHash || !batchIndex) return null;
    const safeHash = String(contentHash || "").replace(/[^a-z0-9_-]/gi, "");
    const safeBatch = String(Math.max(1, Math.floor(Number(batchIndex) || 1)));
    const buttons = await queryRootElements([
      `button.risutts-more-speakers[data-risutts-more-content="${safeHash}"][data-risutts-more-batch="${safeBatch}"]`,
      `button[name="risutts-more-speakers"][data-risutts-more-content="${safeHash}"][data-risutts-more-batch="${safeBatch}"]`,
      `button.risutts-more-${readAllClassToken(safeHash)}-${safeBatch}`,
    ]);
    return buttons[0] || null;
  }

  async function collectMoreSpeakersButtons() {
    return queryRootElements([
      "button.risutts-more-speakers",
      "button.x-risu-risutts-more-speakers",
      "button[name='risutts-more-speakers']",
      "button[class*='risutts-more-']",
    ]);
  }

  async function deferredPayloadForSlot(slot, contentHash) {
    const payloadId = await getElementAttribute(
      slot,
      "data-risutts-more-payload",
      "data-risu-risutts-more-payload"
    ).catch(() => "")
      || String(await getElementClassName(slot).catch(() => "") || "").match(/\brisutts-deferred-payload-(rt_[a-z0-9]+)\b/i)?.[1]
      || "";
    if (!payloadId) return null;
    const existing = payloads.get(payloadId);
    if (existing) return existing;
    const remembered = [
      ...(readAllPayloadsByHash.get(contentHash) || []),
      ...rememberedPayloadsForContentHash(contentHash),
    ];
    const payload = remembered.find((item) => item?.id === payloadId);
    if (!payload) return null;
    payloads.set(payloadId, payload);
    return payload;
  }

  async function revealDeferredSpeakerBatch(contentHash, batchIndex, sourceButton = null) {
    const slots = await deferredSpeakerSlotsForBatch(contentHash, batchIndex);
    const buttonPreviewCache = new Map();
    const clickThroughPayloadIds = [];
    let revealed = 0;
    let missingPayloads = 0;
    for (const slot of slots) {
      const revealedState = await getElementAttribute(slot, "data-risutts-more-revealed", "data-risu-risutts-more-revealed").catch(() => "");
      if (String(revealedState || "").toLowerCase() === "true") continue;
      const payload = await deferredPayloadForSlot(slot, contentHash).catch(() => null);
      if (!payload?.id || !payload?.sourceText || !payload?.mode) {
        missingPayloads += 1;
        continue;
      }
      const options = {
        speakerName: payload.speakerName || "",
        speakerCueGender: payload.speakerCueGender || "",
        segmentKind: payload.segmentKind || "line",
      };
      const html = renderButton(
        payload.id,
        payload.mode,
        payload.sourceText,
        contentHash,
        Number(payload.segmentIndex || 0),
        {
          ...options,
          previewCache: buttonPreviewCache,
        }
      );
      try {
        if (typeof slot.setInnerHTML === "function") {
          await slot.setInnerHTML(html);
          await slot.setAttribute("data-risutts-more-revealed", "true").catch(() => {});
          await slot.setAttribute("data-risu-risutts-more-revealed", "true").catch(() => {});
          revealed += 1;
          if (clickThroughPayloadIds.length < 1) clickThroughPayloadIds.push(payload.id);
        } else {
          missingPayloads += 1;
        }
      } catch {
        missingPayloads += 1;
      }
    }
    if (sourceButton) await setMoreSpeakersButtonVisible(sourceButton, false).catch(() => {});
    const nextButton = await moreSpeakersButtonForBatch(contentHash, batchIndex + 1).catch(() => null);
    if (nextButton) await setMoreSpeakersButtonVisible(nextButton, true).catch(() => {});
    rememberMoreSpeakersRevealedPayloads(contentHash, batchIndex, clickThroughPayloadIds);
    if (revealed > 0) {
      await bindButtons({ source: "more-speakers" }).catch(() => {});
      await bindMoreSpeakersButtons("more-speakers-reveal").catch(() => {});
    }
    addRuntimeLog("개별 스피커 더 보기", {
      contentHash,
      batch: batchIndex,
      revealed,
      missingPayloads,
      nextBatch: Boolean(nextButton),
    });
    return revealed > 0 || Boolean(nextButton);
  }

  async function handleMoreSpeakersButtonEvent(event = null, explicitButton = null) {
    const button = explicitButton
      || await findMoreSpeakersButtonFromEventTarget(event).catch(() => null)
      || await findMoreSpeakersButtonFromEventPoint(event).catch(() => null);
    if (!button) return false;
    const eventType = String(event?.type || event?.eventType || "").toLowerCase();
    const inside = await eventPointInsideElement(event, button, 4).catch(() => null);
    if (inside === false) return true;
    const contentHash = await getMoreSpeakersButtonContentHash(button);
    const batchIndex = await getMoreSpeakersButtonBatch(button);
    if (!contentHash || !batchIndex) {
      consumeDomEvent(event);
      addRuntimeLog("개별 스피커 더 보기 실패", {
        reason: "더보기 버튼의 contentHash 또는 batch가 없습니다.",
        eventType,
      });
      return true;
    }
    consumeDomEvent(event);
    rememberMoreSpeakersEventPoint(event, contentHash, batchIndex);
    if (!acceptMoreSpeakersEvent(event, contentHash, batchIndex)) return true;
    await revealDeferredSpeakerBatch(contentHash, batchIndex, button);
    return true;
  }

  async function findButtonFromEventPoint(event) {
    const point = eventPointerPoint(event);
    if (!point) {
      lastChatButtonEventStatus = "최근 채팅 버튼 이벤트: 좌표 없음";
      return null;
    }
    let target = null;
    try {
      if (rootDoc && typeof rootDoc.elementFromPoint === "function") {
        target = await rootDoc.elementFromPoint(point.x, point.y);
      }
    } catch {
      target = null;
    }
    for (let depth = 0; target && depth < 6; depth += 1) {
      if (await isRisuTtsButton(target, { allowSlowFallback: false }).catch(() => false)) {
        const payloadId = await getButtonPayloadId(target, { allowSlowFallback: false }).catch(() => "");
        lastChatButtonEventStatus = `최근 채팅 버튼 이벤트: 좌표 ${Math.round(point.x)}, ${Math.round(point.y)} / elementFromPoint / 선택 ${payloadId || "확인됨"}`;
        return target;
      }
      try {
        target = typeof target.getParent === "function" ? await target.getParent() : null;
      } catch {
        target = null;
      }
    }
    lastChatButtonEventStatus = `최근 채팅 버튼 이벤트: 좌표 ${Math.round(point.x)}, ${Math.round(point.y)} / 맞는 버튼 없음`;
    return null;
  }

  function logEventFilterWarningOnce() {
    const now = Date.now();
    if (now - lastEventFilterWarningAt < 5000) return;
    lastEventFilterWarningAt = now;
    console.log("[RisuTTS] Speaker event did not include target id or pointer coordinates; ignored to prevent multi-button playback.");
  }

  async function findButtonByPayloadId(payloadId) {
    if (!rootDoc || !payloadId) return null;
    const selectors = [
      `button[data-risutts-id="${payloadId}"]`,
      `button[x-risutts-id="${payloadId}"]`,
      `button[data-risu-risutts-id="${payloadId}"]`,
      `button[x-risu-risutts-id="${payloadId}"]`,
      `button[name="risutts-action"][value="${payloadId}"]`,
      `button[value="${payloadId}"]`,
      `button.risutts-payload-${payloadId}`,
      `button.x-risu-risutts-payload-${payloadId}`,
      `button[class*='risutts-payload-${payloadId}']`,
    ];
    let fallback = null;
    for (const selector of selectors) {
      try {
        let elements = [];
        if (typeof rootDoc.querySelectorAll === "function") {
          elements = await api.unwarpSafeArray(await rootDoc.querySelectorAll(selector));
        }
        if (!elements.length) {
          const element = await rootDoc.querySelector(selector);
          if (element) elements = [element];
        }
        for (const element of elements) {
          if (!element || !(await isRisuTtsButton(element))) continue;
          if (!fallback) fallback = element;
          const rect = await elementRect(element).catch(() => null);
          if (isRenderableViewportRect(rect)) return element;
        }
      } catch {
        // Try the next selector. Some wrappers reject attribute selectors.
      }
    }
    return fallback;
  }

  async function findButtonsByPayloadId(payloadId) {
    if (!rootDoc || !payloadId) return [];
    const direct = await findButtonByPayloadId(payloadId).catch(() => null);
    if (direct) return [direct];
    if (delegatedDomBindingStarted) return [];
    const buttons = await collectRisuTtsButtons({ source: "payload-sync" });
    const matches = [];
    for (const button of buttons) {
      const id = await getButtonPayloadId(button).catch(() => "");
      if (id === payloadId) matches.push(button);
    }
    return matches;
  }

  async function findVisibleButtonByPayloadId(payloadId) {
    const buttons = await findButtonsByPayloadId(payloadId).catch(() => []);
    for (const button of buttons) {
      const rect = await elementRect(button).catch(() => null);
      if (isRenderableViewportRect(rect)) return button;
    }
    return null;
  }

  async function syncChatButtonPayloadState(payloadId, state, mode) {
    if (!payloadId) return;
    const buttons = await findButtonsByPayloadId(payloadId);
    for (const button of buttons) {
      await setButtonState(button, state, mode).catch(() => {});
    }
  }

  async function setActiveChatButtonState(payloadId, state, mode, options = {}) {
    if (!payloadId) return;
    if (state === "busy") {
      activeChatButtonStates.set(payloadId, {
        state,
        mode,
        updatedAt: Date.now(),
      });
    } else {
      activeChatButtonStates.delete(payloadId);
    }
    const directButton = options?.button || null;
    if (directButton) {
      await setButtonState(directButton, state, mode).catch(() => {});
      if (!options?.syncOthers) return;
    }
    if (options?.sync === false) return;
    await syncChatButtonPayloadState(payloadId, state, mode);
  }

  function shouldAcceptActivation(payloadId) {
    const key = payloadId || "unknown";
    const now = Date.now();
    const last = activationTimes.get(key) || 0;
    const active = activeChatButtonStates.get(key);
    if (isCurrentAudioPlayingForPayload(key)) {
      activationTimes.set(key, now);
      chatActivationGatePayloadId = key;
      chatActivationGateUntil = now + CHAT_ACTIVATION_GATE_MS;
      return true;
    }
    if (chatActivationGatePayloadId && chatActivationGatePayloadId !== key && now < chatActivationGateUntil) {
      addRuntimeLog("연속 스피커 이벤트 차단", {
        payloadId: key,
        reason: "한 번의 클릭에서 여러 payload가 동시에 들어오는 것을 차단했습니다.",
        acceptedPayloadId: chatActivationGatePayloadId,
        remainingMs: Math.max(0, chatActivationGateUntil - now),
      });
      return false;
    }
    if (active) {
      const activeAgeMs = now - Number(active.updatedAt || 0);
      if (activeAgeMs < CHAT_ACTIVE_BUTTON_STALE_MS) {
        addRuntimeLog("채팅 스피커 클릭 보류", {
          payloadId: key,
          reason: "이 스피커의 이전 생성/재생 상태가 아직 처리 중입니다.",
          activeAgeMs,
        });
        return false;
      }
      addRuntimeLog("채팅 스피커 stale 상태 해제", {
        payloadId: key,
        activeAgeMs,
      });
      activeChatButtonStates.delete(key);
    }
    if (now - last < CHAT_ACTIVATION_REPEAT_COOLDOWN_MS) {
      addRuntimeLog("채팅 스피커 짧은 재클릭 무시", {
        payloadId: key,
        cooldownMs: CHAT_ACTIVATION_REPEAT_COOLDOWN_MS,
        remainingMs: Math.max(0, CHAT_ACTIVATION_REPEAT_COOLDOWN_MS - (now - last)),
      });
      return false;
    }
    activationTimes.set(key, now);
    chatActivationGatePayloadId = key;
    chatActivationGateUntil = now + CHAT_ACTIVATION_GATE_MS;
    for (const [id, time] of activationTimes.entries()) {
      if (now - time > 5000) activationTimes.delete(id);
    }
    return true;
  }

  async function activateRisuTtsButton(button, event = null, explicitPayloadId = "") {
    const payloadId = explicitPayloadId || await getButtonPayloadId(button);
    const targetPayloadId = await getEventTargetPayloadId(event);
    if (targetPayloadId && payloadId && targetPayloadId !== payloadId) return;
    if (event && !targetPayloadId) {
      const inside = await eventPointInsideElement(event, button);
      if (inside !== true) {
        if (inside == null) logEventFilterWarningOnce();
        return;
      }
    }

    if (!payloadId) {
      console.log("[RisuTTS] Speaker button clicked, but payload id was not found.");
      await setButtonState(button, "error", "ja");
      return;
    }
    if (shouldSuppressRecentlyRevealedSpeakerPayload(payloadId)) {
      consumeDomEvent(event);
      addRuntimeLog("개별 스피커 더보기 직후 새 버튼 클릭 차단", {
        payloadId,
        reason: "+버튼 위치에 새로 나타난 첫 번째 스피커가 같은 클릭으로 재생되는 것을 막았습니다.",
      });
      return;
    }
    if (!acceptSpeakerClickEvent(event, payloadId)) return;
    if (!shouldAcceptActivation(payloadId)) return;
    await handleButtonClick(button, payloadId);
  }

  async function activateRisuTtsPayload(payloadId, event = null, options = {}) {
    const normalizedPayloadId = payloadIdFromHtml(payloadId);
    if (!normalizedPayloadId) return false;
    const payload = payloads.get(normalizedPayloadId);
    if (!payload) {
      addRuntimeLog("개별 스피커 payload 클릭 실패", {
        payloadId: normalizedPayloadId,
        source: options.source || String(event?.type || event?.eventType || "unknown"),
        reason: "payload 저장소에서 대사 정보를 찾지 못했습니다.",
      });
      return false;
    }
    if (shouldSuppressRecentlyRevealedSpeakerPayload(normalizedPayloadId)) {
      consumeDomEvent(event);
      addRuntimeLog("개별 스피커 더보기 직후 새 payload 클릭 차단", {
        payloadId: normalizedPayloadId,
        source: options.source || String(event?.type || event?.eventType || "unknown"),
        reason: "+버튼 위치에 새로 나타난 첫 번째 스피커가 같은 클릭으로 재생되는 것을 막았습니다.",
      });
      return true;
    }
    if (!acceptSpeakerClickEvent(event, normalizedPayloadId)) return true;
    if (!shouldAcceptActivation(normalizedPayloadId)) return true;
    consumeDomEvent(event);
    addRuntimeLog("개별 스피커 payload 클릭", {
      payloadId: normalizedPayloadId,
      source: options.source || String(event?.type || event?.eventType || "unknown"),
      mode: payload.mode,
      speakerName: payload.speakerName,
      segmentKind: payload.segmentKind,
      text: payload.sourceText,
    });
    await handleButtonClick(options.button || null, normalizedPayloadId, {
      syncState: options.syncState !== false,
    });
    return true;
  }

  async function handleDelegatedButtonEvent(event = null) {
    const eventType = String(event?.type || event?.eventType || "").toLowerCase();
    const resolved = await resolveSpeakerButtonFromEvent(event);
    let payloadId = resolved.payloadId || "";
    let button = resolved.button || null;
    if (!button && payloadId) button = await findButtonByPayloadId(payloadId).catch(() => null);
    if (payloadId && button) lastChatButtonEventStatus = `최근 채팅 버튼 이벤트: target ${payloadId}`;
    if (!payloadId || !button) {
      if (payloadId || button) {
        addRuntimeLog("채팅 스피커 클릭 대상 없음", {
          eventType,
          payloadId: String(payloadId || ""),
          buttonFound: Boolean(button),
          button: button ? await summarizeSpeakerAnchorForReadAllLog(button).catch(() => null) : null,
          eventPayloadId: resolved.eventPayloadId || "",
          pointPayloadId: resolved.pointPayloadId || "",
          reason: resolved.reason || (payloadId ? "payloadId는 있으나 버튼을 찾지 못했습니다." : "버튼은 있으나 payloadId를 찾지 못했습니다."),
        });
      }
      return;
    }
    await activateRisuTtsButton(button, event, payloadId);
  }

  async function handleDelegatedReadAllEvent(event = null) {
    const eventType = String(event?.type || event?.eventType || "").toLowerCase();
    const button = await findReadAllButtonFromEventTarget(event).catch(() => null);
    const targetTrusted = Boolean(button);
    const contentHash = button ? await getReadAllContentHash(button).catch(() => "") : "";
    if (!button || !contentHash) return false;
    const inside = await eventPointInsideReadAllButton(event, button).catch(() => null);
    if (inside !== true) {
      addReadAllIgnoredClickLog(
        contentHash,
        `event-target-${eventType || "unknown"}`,
        "포인터 좌표가 전체 읽기 버튼 안에 없습니다."
      );
      return targetTrusted;
    }
    consumeDomEvent(event);
    const recentInsertAt = readAllRecentInsertTimes.get(contentHash) || 0;
    if (recentInsertAt && Date.now() - recentInsertAt < READ_ALL_ACTIVATION_AFTER_INSERT_DELAY_MS) {
      addReadAllIgnoredClickLog(
        contentHash,
        `event-target-${eventType || "unknown"}`,
        "삽입 직후 이벤트입니다."
      );
      return true;
    }
    const source = `event-target-${eventType || "unknown"}`;
    addRuntimeLog("전체 읽기 버튼 클릭", {
      contentHash,
      source,
      targetTrusted,
      button: await summarizeReadAllButtonForReadAllLog(button).catch(() => null),
    });
    await activateReadAllButton(button, null, contentHash);
    return true;
  }

  async function isRisuTtsButton(element, options = {}) {
    const payloadId = await getButtonPayloadId(element, options);
    if (payloadId) return true;
    const className = await getElementClassName(element);
    return /\brisutts-action\b/.test(String(className || ""))
      || /\bx-risu-risutts-action\b/.test(String(className || ""));
  }

  async function hasLikelyRisuTtsDomMarker() {
    if (!rootDoc) return false;
    const selectors = [
      ".risutts-action",
      ".risutts-wrap",
      "[class*='risutts']",
      "[data-risutts-id]",
      "[data-risutts-content]",
      "[x-risutts-id]",
      "[x-risutts-content]",
      "[data-risu-risutts-id]",
      "[x-risu-risutts-id]",
      ".x-risu-risutts-action",
      "button[name='risutts-action']",
      "button[value^='rt_']",
    ];
    for (const selector of selectors) {
      try {
        if (await rootDoc.querySelector(selector)) return true;
      } catch {
        // Some RisuAI wrappers reject newer CSS selectors; try the next one.
      }
    }
    return false;
  }

  async function getElementClassName(element) {
    try {
      if (typeof element.getClassName === "function") {
        return await element.getClassName();
      }
    } catch {
      // Fall back to getAttribute for older wrappers.
    }
    return getElementAttribute(element, "class");
  }

  async function collectRisuTtsButtons(options = {}) {
    const scanStartedAt = monotonicNow();
    const source = options.source || "unknown";
    const scanEpoch = Number.isFinite(Number(options.scanEpoch)) ? Number(options.scanEpoch) : null;
    const isScanCurrent = () => scanEpoch == null || isDomScanEpochCurrent(scanEpoch);
    if (!rootDoc) {
      lastButtonScanStatus = "rootDoc 없음";
      return [];
    }
    if (!isScanCurrent()) {
      lastButtonScanStatus = `stale scan (${source})`;
      return [];
    }
    const selectors = [
      "button[data-risutts-id]",
      "button[x-risutts-id]",
      "button.risutts-action",
      "button[name='risutts-action']",
      "button[value^='rt_']",
      "[data-risutts-id]",
      "[x-risutts-id]",
      ".risutts-action",
      "button",
    ];
    const foundButtons = [];
    const seenKeys = new Set();
    const selectorStats = [];
    let checkedButtons = 0;
    for (const selector of selectors) {
      if (!isScanCurrent()) {
        selectorStats.push(`${selector}:stale`);
        break;
      }
      const allowSlowFallback = selector === "button";
      if (foundButtons.length) {
        selectorStats.push("remaining:skipped-specific");
        break;
      }
      if (selector === "button" && !(await hasLikelyRisuTtsDomMarker().catch(() => false))) {
        selectorStats.push("button:skipped-no-marker");
        continue;
      }
      let elements = [];
      try {
        const selected = await rootDoc.querySelectorAll(selector);
        if (!isScanCurrent()) {
          selectorStats.push(`${selector}:stale`);
          break;
        }
        elements = await api.unwarpSafeArray(selected);
        if (!isScanCurrent()) {
          selectorStats.push(`${selector}:stale`);
          break;
        }
        selectorStats.push(`${selector}:${elements.length}`);
      } catch (error) {
        selectorStats.push(`${selector}:err`);
        console.log(`[RisuTTS] Button query failed (${selector}): ${describeError(error)}`);
        continue;
      }
      for (const element of elements) {
        if (!isScanCurrent()) {
          selectorStats.push(`${selector}:stale`);
          break;
        }
        if (!element) continue;
        checkedButtons += 1;
        if (!(await isRisuTtsButton(element, { allowSlowFallback }))) continue;
        if (!isScanCurrent()) {
          selectorStats.push(`${selector}:stale`);
          break;
        }
        const payloadId = await getButtonPayloadId(element, { allowSlowFallback });
        const key = payloadId || (allowSlowFallback ? await element.getOuterHTML().catch(() => "") : `${selector}:${foundButtons.length}`);
        if (key && seenKeys.has(key)) continue;
        if (key) seenKeys.add(key);
        foundButtons.push(element);
      }
    }
    lastButtonScanStatus = `${selectorStats.join(", ")} => RisuTTS ${foundButtons.length}`;
    addSlowRuntimeLog("collectRisuTtsButtons", scanStartedAt, {
      source,
      scanEpoch,
      selectors: selectorStats.join(", "),
      checkedButtons,
      foundButtons: foundButtons.length,
    });
    return foundButtons;
  }

  async function isRisuTtsReadAllButton(element) {
    const contentHash = await getReadAllContentHash(element);
    if (contentHash) return true;
    const className = await getElementClassName(element);
    const classTokens = String(className || "").split(/\s+/);
    if (classTokens.includes("risutts-read-all") || classTokens.includes("x-risu-risutts-read-all")) return true;
    return hasReadAllButtonMarker(element);
  }

  async function collectRisuTtsReadAllButtons() {
    if (!rootDoc) return [];
    const selectors = [
      "button.risutts-read-all",
      ".risutts-read-all",
      "button.x-risu-risutts-read-all",
      ".x-risu-risutts-read-all",
      "button[class*='x-risu-risutts-read-all']",
      "[class*='x-risu-risutts-read-all']",
      "button[x-risutts-read-all]",
      "[x-risutts-read-all]",
      "button[x-risu-risutts-read-all]",
      "[x-risu-risutts-read-all]",
      "button[data-risutts-role='read-all']",
      "[data-risutts-role='read-all']",
      "button[data-risu-risutts-role='read-all']",
      "[data-risu-risutts-role='read-all']",
      "button[name='risutts-read-all']",
      "[name='risutts-read-all']",
      "button[title='RisuTTS 전체 읽기']",
      "button[aria-label='RisuTTS 전체 읽기']",
    ];
    const foundButtons = [];
    const seenKeys = new Set();
    for (const selector of selectors) {
      let elements = [];
      try {
        const selected = await rootDoc.querySelectorAll(selector);
        elements = await api.unwarpSafeArray(selected);
      } catch {
        continue;
      }
      for (const element of elements) {
        if (!element || !(await isRisuTtsReadAllButton(element))) continue;
        const contentHash = await getReadAllContentHash(element).catch(() => "");
        const key = await readAllButtonCollectionKey(element, contentHash, foundButtons.length).catch(() => "");
        if (key && seenKeys.has(key)) continue;
        if (key) seenKeys.add(key);
        foundButtons.push(element);
      }
    }
    return foundButtons;
  }

  async function readAllButtonCollectionKey(button, contentHash = "", fallbackIndex = 0) {
    const [rect, className, placement] = await Promise.all([
      elementRect(button).catch(() => null),
      getElementClassName(button).catch(() => ""),
      getElementAttribute(
        button,
        "x-risutts-read-all-placement",
        "data-risutts-read-all-placement",
        "x-risu-risutts-read-all-placement",
        "data-risu-risutts-read-all-placement"
      ).catch(() => ""),
    ]);
    if (rect && rect.width > 0 && rect.height > 0) {
      return [
        "rect",
        Math.round(rect.left),
        Math.round(rect.top),
        Math.round(rect.width),
        Math.round(rect.height),
        contentHash || "",
        placement || "",
        className || "",
      ].join(":");
    }
    return `fallback:${fallbackIndex}:${contentHash || ""}:${placement || ""}:${className || ""}`;
  }

  async function findReadAllButtonByContentHash(contentHash) {
    if (!contentHash) return null;
    const buttons = await collectRisuTtsReadAllButtons();
    for (const button of buttons) {
      const hash = await getReadAllContentHash(button).catch(() => "");
      if (readAllHashesMatch(hash, contentHash)) return button;
    }
    return null;
  }

  async function findReadAllButtonsByContentHash(contentHash) {
    if (!contentHash) return [];
    const buttons = await collectRisuTtsReadAllButtons();
    const matches = [];
    for (const button of buttons) {
      const hash = await getReadAllContentHash(button).catch(() => "");
      if (readAllHashesMatch(hash, contentHash)) {
        matches.push(button);
      }
    }
    return matches;
  }

  function pruneReadAllInsertMemory(now = Date.now()) {
    for (const [hash, at] of readAllRecentInsertTimes.entries()) {
      if (now - at > READ_ALL_INSERT_MEMORY_TTL_MS) {
        readAllRecentInsertTimes.delete(hash);
      }
    }
  }

  function rememberReadAllInsert(contentHash) {
    if (!contentHash) return;
    const now = Date.now();
    pruneReadAllInsertMemory(now);
    readAllRecentInsertTimes.set(contentHash, now);
  }

  async function isReadAllButtonHidden(button) {
    const hidden = await getElementAttribute(button, "x-risutts-hidden", "x-risu-risutts-hidden", "data-risutts-hidden", "data-risu-risutts-hidden").catch(() => "");
    const style = await getElementStyleAttribute(button).catch(() => "");
    return String(hidden || "").toLowerCase() === "true"
      || /display\s*:\s*none/i.test(String(style || ""));
  }

  async function reviveReadAllButton(button) {
    if (!button) return false;
    const contentHash = await getReadAllContentHash(button).catch(() => "");
    const placement = await getElementAttribute(
      button,
      "x-risutts-read-all-placement",
      "data-risutts-read-all-placement",
      "x-risu-risutts-read-all-placement",
      "data-risu-risutts-read-all-placement"
    ).catch(() => configuredReadAllButtonPlacement());
    await button.setAttribute("x-risutts-hidden", "false").catch(() => {});
    await button.setAttribute("x-risu-risutts-hidden", "false").catch(() => {});
    await button.setAttribute("data-risutts-hidden", "false").catch(() => {});
    await button.setAttribute("data-risu-risutts-hidden", "false").catch(() => {});
    await setReadAllButtonState(button, "idle").catch(() => {});
    return true;
  }

  async function hideReadAllButton(button) {
    if (!button) return;
    await button.setAttribute("x-risutts-hidden", "true").catch(() => {});
    await button.setAttribute("x-risu-risutts-hidden", "true").catch(() => {});
    await button.setAttribute("data-risutts-hidden", "true").catch(() => {});
    await button.setAttribute("data-risu-risutts-hidden", "true").catch(() => {});
    await setElementStyleAttribute(button, "display:none").catch(() => {});
  }

  async function hideReadAllButtonsForContentHash(contentHash) {
    if (!contentHash) return;
    const buttons = await findReadAllButtonsByContentHash(contentHash).catch(() => []);
    for (const button of buttons) {
      await hideReadAllButton(button).catch(() => {});
    }
    readAllRecentInsertTimes.delete(contentHash);
  }

  function isRenderableViewportRect(rect) {
    return Boolean(rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < 4096);
  }

  function isRenderableDomRect(rect) {
    return Boolean(rect && rect.width > 0 && rect.height > 0);
  }

  function looksLikeNonChatToolbarArea(text) {
    return /제작자\s*코멘트|creator\s*comment|creator comment|language setting|언어\s*설정/i.test(String(text || ""));
  }

  async function isSpeakerButtonForReadAllGrouping(button) {
    const rect = await elementRect(button).catch(() => null);
    if (!isRenderableDomRect(rect)) return false;
    const descriptor = await elementDescriptorTextWithParents(button, null, 2).catch(() => "");
    if (looksLikeNonChatToolbarArea(descriptor)) return false;
    return true;
  }

  async function isVisibleSpeakerButtonForReadAll(button) {
    const rect = await elementRect(button).catch(() => null);
    if (!isRenderableViewportRect(rect)) return false;
    const descriptor = await elementDescriptorTextWithParents(button, null, 2).catch(() => "");
    if (looksLikeNonChatToolbarArea(descriptor)) return false;
    return true;
  }

  async function visibleSpeakerButtonsForReadAll(buttons) {
    const records = [];
    for (const button of buttons || []) {
      if (!button) continue;
      if (!await isVisibleSpeakerButtonForReadAll(button).catch(() => false)) continue;
      const rect = await elementRect(button).catch(() => null);
      if (!isRenderableViewportRect(rect)) continue;
      records.push({ button, rect });
    }
    records.sort((a, b) => {
      if (Math.abs(a.rect.top - b.rect.top) > 12) return a.rect.top - b.rect.top;
      return a.rect.left - b.rect.left;
    });
    return records.map((record) => record.button);
  }

  async function collectSpeakerButtonsWithin(container) {
    if (!container || typeof container.querySelectorAll !== "function") return [];
    const selectors = [
      "button.risutts-action",
      ".risutts-action",
      "button[x-risutts-id]",
      "[x-risutts-id]",
    ];
    const found = [];
    const seen = new Set();
    for (const selector of selectors) {
      let selected = [];
      try {
        selected = await api.unwarpSafeArray(await container.querySelectorAll(selector));
      } catch {
        continue;
      }
      for (const button of selected) {
        if (!button || !(await isRisuTtsButton(button).catch(() => false))) continue;
        const payloadId = await getButtonPayloadId(button).catch(() => "");
        const key = payloadId || await button.getOuterHTML().catch(() => "") || `${found.length}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push(button);
      }
    }
    return found;
  }

  function rectContainsButtonRect(containerRect, buttonRect) {
    if (!isRenderableDomRect(containerRect) || !isRenderableDomRect(buttonRect)) return false;
    const centerX = (buttonRect.left || 0) + (buttonRect.width || 0) / 2;
    const centerY = (buttonRect.top || 0) + (buttonRect.height || 0) / 2;
    const padX = 16;
    const padY = 16;
    return centerX >= (containerRect.left || 0) - padX
      && centerX <= (containerRect.right || ((containerRect.left || 0) + (containerRect.width || 0))) + padX
      && centerY >= (containerRect.top || 0) - padY
      && centerY <= (containerRect.bottom || ((containerRect.top || 0) + (containerRect.height || 0))) + padY;
  }

  async function collectKnownSpeakerButtonsInsideRect(buttons, containerRect) {
    const result = [];
    const seen = new Set();
    for (const button of buttons || []) {
      if (!button || !(await isRisuTtsButton(button).catch(() => false))) continue;
      const rect = await elementRect(button).catch(() => null);
      if (!rectContainsButtonRect(containerRect, rect)) continue;
      const payloadId = await getButtonPayloadId(button).catch(() => "");
      const key = payloadId || await button.getOuterHTML().catch(() => "") || `${result.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(button);
    }
    return result;
  }

  async function collectSpeakerButtonsForRootCandidate(container, rect, knownButtons = []) {
    const queried = await collectSpeakerButtonsWithin(container).catch(() => []);
    if (queried.length >= 2 || !knownButtons?.length) {
      return { buttons: queried, source: "query" };
    }
    const knownInside = await collectKnownSpeakerButtonsInsideRect(knownButtons, rect).catch(() => []);
    return knownInside.length > queried.length
      ? { buttons: knownInside, source: "geometry" }
      : { buttons: queried, source: "query" };
  }

  async function readAllMessageRootStableAttribute(element) {
    if (!element) return "";
    const names = [
      "data-message-id",
      "data-message-index",
      "data-chat-index",
      "data-chat-message-id",
      "data-risu-message-id",
      "data-risu-chat-index",
      "id",
      "data-risutts-message-root",
      "x-risutts-message-root",
    ];
    for (const name of names) {
      const value = await getElementAttribute(element, name).catch(() => "");
      if (value) return `${name}:${String(value)}`;
    }
    return "";
  }

  function isRisuTtsGeneratedMessageRootStable(stable) {
    return /^(?:data|x)-risutts-message-root:/i.test(String(stable || ""));
  }

  function readAllMessageRootStableScore(stable, strongScore, generatedScore = 6) {
    if (!stable) return 0;
    return isRisuTtsGeneratedMessageRootStable(stable) ? generatedScore : strongScore;
  }

  async function ensureReadAllMessageRootKey(root) {
    if (!root) return "";
    const existing = await readAllMessageRootStableAttribute(root).catch(() => "");
    if (existing) return existing;
    const key = `rtm_${Date.now().toString(36)}_${(readAllMessageRootSeq += 1).toString(36)}`;
    await root.setAttribute("data-risutts-message-root", key).catch(() => {});
    await root.setAttribute("x-risutts-message-root", key).catch(() => {});
    return `data-risutts-message-root:${key}`;
  }

  function looksLikeReadAllForbiddenRootText(text) {
    return looksLikeNonChatToolbarArea(text)
      || /무언가\s*입력하여\s*채팅을\s*시작|contenteditable|textarea|\binput\b|\bsend\b|(?:^|[\s"'<>])전송(?:$|[\s"'<>])/i.test(String(text || ""))
      || /risutts-settings|RisuTTS\s+v\d|보이스\s*탐색기|레퍼런스\s*설정/i.test(String(text || ""));
  }

  async function findReadAllMessageRoot(button, contentHash = "", knownButtons = []) {
    if (!button) return null;
    const targetHash = String(contentHash || "");
    const candidates = [];
    let current = button;
    for (let depth = 0; current && depth < 16; depth += 1) {
      try {
        current = typeof current.getParent === "function" ? await current.getParent() : null;
      } catch {
        current = null;
      }
      if (!current) break;
      const rect = await elementRect(current).catch(() => null);
      if (!isRenderableDomRect(rect)) continue;
      const collected = await collectSpeakerButtonsForRootCandidate(current, rect, targetHash ? knownButtons : []).catch(() => ({ buttons: [], source: "query" }));
      const speakerButtons = collected.buttons || [];
      if (speakerButtons.length < 2) continue;
      const descriptor = await elementDescriptorTextWithParents(current, null, 1).catch(() => "");
      if (looksLikeReadAllForbiddenRootText(descriptor) && collected.source !== "geometry") continue;
      let sameHashCount = 0;
      let otherHashCount = 0;
      for (const speakerButton of speakerButtons) {
        const hash = await getButtonContentHash(speakerButton).catch(() => "");
        if (targetHash && hash === targetHash) sameHashCount += 1;
        else if (targetHash && hash) otherHashCount += 1;
      }
      if (targetHash && sameHashCount < 2) continue;
      if (targetHash && otherHashCount > Math.max(3, sameHashCount)) continue;
      const controls = await elementActionControls(current).catch(() => []);
      const stable = await readAllMessageRootStableAttribute(current).catch(() => "");
      const stableScore = readAllMessageRootStableScore(stable, 80, 6);
      const oversizePenalty = rect.height > 2600 ? 30 : 0;
      const mixedPenalty = otherHashCount * 8;
      candidates.push({
        root: current,
        rect,
        depth,
        sameHashCount,
        totalCount: speakerButtons.length,
        controls: controls.length,
        source: collected.source,
        stable,
        generatedStable: isRisuTtsGeneratedMessageRootStable(stable),
        score: stableScore
          + sameHashCount * 30
          + Math.min(speakerButtons.length, 12) * 4
          + (collected.source === "geometry" ? 18 : 0)
          + (controls.length >= 2 ? 36 : 0)
          - depth * 2
          - oversizePenalty
          - mixedPenalty,
      });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates[0];
    const key = await ensureReadAllMessageRootKey(chosen.root).catch(() => "") || `root:${hashText(`${targetHash}:${chosen.depth}:${chosen.totalCount}`)}`;
    return { root: chosen.root, key, rect: chosen.rect, candidate: chosen };
  }

  async function findLooseReadAllMessageRoot(button) {
    if (!button) return null;
    const candidates = [];
    let current = button;
    for (let depth = 0; current && depth < 18; depth += 1) {
      try {
        current = typeof current.getParent === "function" ? await current.getParent() : null;
      } catch {
        current = null;
      }
      if (!current) break;
      const rect = await elementRect(current).catch(() => null);
      if (!isRenderableDomRect(rect)) continue;
      if (rect.height > 5200 || rect.width > 4096) continue;
      const descriptor = await elementDescriptorTextWithParents(current, null, 1).catch(() => "");
      if (looksLikeReadAllForbiddenRootText(descriptor)) continue;
      const [
        className,
        role,
        id,
        dataMessageId,
        dataChatIndex,
        speakerButtons,
        controls,
        stable,
      ] = await Promise.all([
        getElementClassName(current).catch(() => ""),
        getElementAttribute(current, "role").catch(() => ""),
        getElementAttribute(current, "id").catch(() => ""),
        getElementAttribute(current, "data-message-id").catch(() => ""),
        getElementAttribute(current, "data-chat-index").catch(() => ""),
        collectSpeakerButtonsWithin(current).catch(() => []),
        elementActionControls(current).catch(() => []),
        readAllMessageRootStableAttribute(current).catch(() => ""),
      ]);
      const structuralText = [
        className,
        role,
        id,
        dataMessageId,
        dataChatIndex,
      ].filter(Boolean).join(" ");
      const messageHint = /(?:^|[\s_-])(chat|message|msg|prose|markdown|content|assistant|bot|user|response|answer)(?:$|[\s_-])/i.test(structuralText);
      const controlHint = controls.length >= 2;
      const stableScore = readAllMessageRootStableScore(stable, 90, 6);
      const stableHint = stableScore > 0;
      const sizeHint = rect.width >= 360 && rect.height >= 48;
      if (!stableHint && !controlHint && !(messageHint && sizeHint)) continue;
      const oversizePenalty = rect.height > 2200 ? 36 : 0;
      candidates.push({
        root: current,
        rect,
        depth,
        totalCount: speakerButtons.length,
        controls: controls.length,
        stable,
        generatedStable: isRisuTtsGeneratedMessageRootStable(stable),
        messageHint,
        score: stableScore
          + (controlHint ? 42 : 0)
          + (messageHint ? 28 : 0)
          + Math.min(speakerButtons.length, 12) * 6
          + Math.min(rect.width, 1200) / 120
          - depth * 3
          - oversizePenalty,
      });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates[0];
    const key = await ensureReadAllMessageRootKey(chosen.root).catch(() => "")
      || `loose-root:${hashText(`${chosen.depth}:${chosen.totalCount}:${Math.round(chosen.rect.top || 0)}`)}`;
    return { root: chosen.root, key, rect: chosen.rect, candidate: chosen };
  }

  function readAllVisualStateForHash(contentHash) {
    return contentHash && activeReadAllContentHash === contentHash ? "busy" : "idle";
  }

  async function retargetReadAllButton(button, contentHash, placement = READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP) {
    if (!button || !contentHash) return false;
    const classToken = readAllClassToken(contentHash);
    const safePlacement = readAllPlacementMatchesConfig(placement) ? placement : configuredReadAllButtonPlacement();
    const state = readAllVisualStateForHash(contentHash);
    await button.setClassName(`risutts-read-all x-risu-risutts-read-all risutts-read-all-${classToken} x-risu-risutts-read-all-${classToken}`).catch(() => {});
    await button.setAttribute("data-risutts-role", "read-all").catch(() => {});
    await button.setAttribute("data-risu-risutts-role", "read-all").catch(() => {});
    await button.setAttribute("x-risutts-read-all", contentHash).catch(() => {});
    await button.setAttribute("data-risutts-read-all", contentHash).catch(() => {});
    await button.setAttribute("x-risu-risutts-read-all", contentHash).catch(() => {});
    await button.setAttribute("data-risu-risutts-read-all", contentHash).catch(() => {});
    await button.setAttribute("x-risutts-content", contentHash).catch(() => {});
    await button.setAttribute("data-risutts-content", contentHash).catch(() => {});
    await button.setAttribute("x-risu-risutts-content", contentHash).catch(() => {});
    await button.setAttribute("data-risu-risutts-content", contentHash).catch(() => {});
    await button.setAttribute("x-risutts-read-all-state", state).catch(() => {});
    await button.setAttribute("x-risutts-hidden", "false").catch(() => {});
    await button.setAttribute("x-risutts-read-all-placement", safePlacement).catch(() => {});
    await button.setAttribute("data-risutts-read-all-placement", safePlacement).catch(() => {});
    await button.setAttribute("x-risu-risutts-read-all-placement", safePlacement).catch(() => {});
    await button.setAttribute("data-risu-risutts-read-all-placement", safePlacement).catch(() => {});
    await setElementStyleAttribute(button, await readAllButtonStyleForState(button, state)).catch(() => {});
    if (typeof button.setInnerHTML === "function") {
      await button.setInnerHTML(state === "busy" ? "■" : RISUTTS_READ_ALL_ICON).catch(() => {});
    }
    return true;
  }

  async function isReadAllButtonLeftOfSpeaker(button, speakerButton) {
    if (!button || !speakerButton) return false;
    const [buttonRect, speakerRect] = await Promise.all([
      elementRect(button).catch(() => null),
      elementRect(speakerButton).catch(() => null),
    ]);
    return readAllLeftOfSpeakerRelation(buttonRect, speakerRect).ok;
  }

  async function readAllGroupBounds(buttons) {
    const rects = [];
    for (const button of buttons || []) {
      const rect = await elementRect(button).catch(() => null);
      if (isRenderableViewportRect(rect)) rects.push(rect);
    }
    if (!rects.length) return null;
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
      count: rects.length,
    };
  }

  async function findReadAllButtonFromEventPoint(event) {
    const point = eventPointerPoint(event);
    if (!point) return null;
    const buttons = await collectRisuTtsReadAllButtons();
    for (const button of buttons) {
      if (await eventPointInsideReadAllButton(event, button)) return button;
    }
    return null;
  }

  async function elementTextContent(element) {
    try {
      if (typeof element.textContent === "function") return await element.textContent();
    } catch {
      // Fall through to outerHTML.
    }
    try {
      return await element.getOuterHTML();
    } catch {
      return "";
    }
  }

  async function elementDescriptorText(element) {
    const [className, title, aria, name, value, text] = await Promise.all([
      getElementClassName(element).catch(() => ""),
      getElementAttribute(element, "title").catch(() => ""),
      getElementAttribute(element, "aria-label").catch(() => ""),
      getElementAttribute(element, "name").catch(() => ""),
      getElementAttribute(element, "value").catch(() => ""),
      elementTextContent(element).catch(() => ""),
    ]);
    return [className, title, aria, name, value, text].filter(Boolean).join(" ");
  }

  async function elementDescriptorTextWithParents(element, stopAncestor = null, maxDepth = 2) {
    const parts = [];
    let current = element;
    for (let depth = 0; current && depth <= maxDepth; depth += 1) {
      parts.push(await elementDescriptorText(current).catch(() => ""));
      if (current === stopAncestor) break;
      try {
        current = typeof current.getParent === "function" ? await current.getParent() : null;
      } catch {
        current = null;
      }
    }
    return parts.filter(Boolean).join(" ");
  }

  async function elementButtons(element) {
    try {
      if (typeof element.querySelectorAll !== "function") return [];
      const selected = await element.querySelectorAll("button");
      return await api.unwarpSafeArray(selected);
    } catch {
      return [];
    }
  }

  async function elementActionControls(element) {
    try {
      if (typeof element.querySelectorAll !== "function") return [];
      const selected = await element.querySelectorAll([
        "button",
        "[role='button']",
        "[aria-label]",
        "[title]",
        "[class*='translate']",
        "[class*='Translate']",
        "[class*='language']",
        "[class*='Language']",
        "[class*='languages']",
        "[class*='Languages']",
        "[class*='lucide']",
        "svg",
      ].join(","));
      const controls = await api.unwarpSafeArray(selected);
      const seen = new Set();
      const result = [];
      for (const control of controls) {
        if (!control) continue;
        const key = await control.getOuterHTML?.().catch(() => "") || await elementDescriptorText(control).catch(() => "");
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        result.push(control);
      }
      return result;
    } catch {
      return [];
    }
  }

  async function elementRect(element) {
    try {
      if (!element || typeof element.getBoundingClientRect !== "function") return null;
      const rect = await element.getBoundingClientRect();
      const left = finiteEventNumber(rect?.left ?? rect?.x);
      const top = finiteEventNumber(rect?.top ?? rect?.y);
      const width = finiteEventNumber(rect?.width);
      const height = finiteEventNumber(rect?.height);
      const right = finiteEventNumber(rect?.right) ?? (left != null && width != null ? left + width : null);
      const bottom = finiteEventNumber(rect?.bottom) ?? (top != null && height != null ? top + height : null);
      if (left == null || top == null || right == null || bottom == null) return null;
      return {
        left,
        top,
        right,
        bottom,
        width: width ?? Math.max(0, right - left),
        height: height ?? Math.max(0, bottom - top),
      };
    } catch {
      return null;
    }
  }

  function summarizeToolbarCandidate(rect, descriptor, score) {
    const text = String(descriptor || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    return {
      score,
      left: Math.round(rect?.left ?? 0),
      top: Math.round(rect?.top ?? 0),
      width: Math.round(rect?.width ?? 0),
      height: Math.round(rect?.height ?? 0),
      text,
    };
  }

  function summarizeDomRect(rect) {
    return {
      left: Math.round(rect?.left ?? 0),
      top: Math.round(rect?.top ?? 0),
      width: Math.round(rect?.width ?? 0),
      height: Math.round(rect?.height ?? 0),
    };
  }

  function readAllLeftOfSpeakerRelation(buttonRect, speakerRect) {
    const summary = {
      ok: false,
      reason: "",
      horizontalGap: null,
      verticalOverlap: null,
      button: summarizeDomRect(buttonRect),
      speaker: summarizeDomRect(speakerRect),
    };
    if (!isRenderableViewportRect(buttonRect)) {
      summary.reason = "read-all button is not renderable in viewport";
      return summary;
    }
    if (!isRenderableViewportRect(speakerRect)) {
      summary.reason = "speaker button is not renderable in viewport";
      return summary;
    }
    if (buttonRect.width > 80 || buttonRect.height > 80) {
      summary.reason = "read-all button rect is too large";
      return summary;
    }
    const verticalOverlap = Math.min(buttonRect.bottom, speakerRect.bottom) - Math.max(buttonRect.top, speakerRect.top);
    const requiredOverlap = Math.min(10, Math.max(4, Math.min(buttonRect.height, speakerRect.height) * 0.45));
    summary.verticalOverlap = Math.round(verticalOverlap);
    if (verticalOverlap < requiredOverlap) {
      summary.reason = "read-all button is not vertically aligned with speaker";
      return summary;
    }
    const horizontalGap = speakerRect.left - buttonRect.right;
    summary.horizontalGap = Math.round(horizontalGap);
    if (horizontalGap < -8 || horizontalGap > 32) {
      summary.reason = "read-all button is not close to the left side of speaker";
      return summary;
    }
    if (!(buttonRect.left < speakerRect.left + 4)) {
      summary.reason = "read-all button is not left of speaker";
      return summary;
    }
    summary.ok = true;
    summary.reason = "ok";
    return summary;
  }

  async function summarizeSpeakerAnchorForReadAllLog(button, target = null) {
    const [buttonRect, descriptor, payloadId, contentHash] = await Promise.all([
      elementRect(button).catch(() => null),
      elementDescriptorTextWithParents(button, null, 1).catch(() => ""),
      getButtonPayloadId(button).catch(() => ""),
      getButtonContentHash(button).catch(() => ""),
    ]);
    const summary = {
      payloadId: String(payloadId || "").slice(0, 64),
      contentHash: String(contentHash || ""),
      button: summarizeToolbarCandidate(buttonRect, descriptor, 0),
    };
    if (target) {
      const [targetRect, targetDescriptor] = await Promise.all([
        elementRect(target).catch(() => null),
        elementDescriptorTextWithParents(target, null, 1).catch(() => ""),
      ]);
      summary.targetMode = target === button ? "speaker-button" : "speaker-wrapper";
      summary.target = summarizeToolbarCandidate(targetRect, targetDescriptor, 0);
    }
    return summary;
  }

  async function summarizeReadAllButtonForReadAllLog(button, speakerButton = null) {
    const [rect, descriptor, contentHash, placement, hidden, speakerRect] = await Promise.all([
      elementRect(button).catch(() => null),
      elementDescriptorTextWithParents(button, null, 1).catch(() => ""),
      getReadAllContentHash(button).catch(() => ""),
      getElementAttribute(
        button,
        "x-risutts-read-all-placement",
        "data-risutts-read-all-placement",
        "x-risu-risutts-read-all-placement",
        "data-risu-risutts-read-all-placement"
      ).catch(() => ""),
      isReadAllButtonHidden(button).catch(() => false),
      speakerButton ? elementRect(speakerButton).catch(() => null) : Promise.resolve(null),
    ]);
    const summary = {
      contentHash: String(contentHash || ""),
      placement: String(placement || ""),
      hidden: Boolean(hidden),
      button: summarizeToolbarCandidate(rect, descriptor, 0),
    };
    if (speakerButton) {
      summary.relation = readAllLeftOfSpeakerRelation(rect, speakerRect);
    }
    return summary;
  }

  function readAllRootDebugKey(contentHash, placement) {
    return `${contentHash || "unknown"}:${placement || configuredReadAllButtonPlacement()}`;
  }

  function shouldLogReadAllRootDebug(contentHash, placement) {
    const key = readAllRootDebugKey(contentHash, placement);
    const now = Date.now();
    for (const [storedKey, at] of readAllRootDebugLogTimes.entries()) {
      if (now - at > READ_ALL_ROOT_DEBUG_LOG_COOLDOWN_MS * 4) readAllRootDebugLogTimes.delete(storedKey);
    }
    const last = readAllRootDebugLogTimes.get(key) || 0;
    if (now - last < READ_ALL_ROOT_DEBUG_LOG_COOLDOWN_MS) return false;
    readAllRootDebugLogTimes.set(key, now);
    return true;
  }

  function rootDebugText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
  }

  async function collectReadAllRootDebugRecords(anchorButton, contentHash, knownButtons = []) {
    const targetHash = String(contentHash || "");
    const records = [];
    let current = anchorButton;
    for (let depth = 0; current && depth < 16; depth += 1) {
      try {
        current = typeof current.getParent === "function" ? await current.getParent() : null;
      } catch {
        current = null;
      }
      if (!current) break;
      const rect = await elementRect(current).catch(() => null);
      const className = await getElementClassName(current).catch(() => "");
      const stable = await readAllMessageRootStableAttribute(current).catch(() => "");
      const record = {
        depth,
        reason: "",
        source: "",
        rect: summarizeDomRect(rect),
        speakerButtons: 0,
        sameHashCount: 0,
        otherHashCount: 0,
        controls: 0,
        stable: rootDebugText(stable),
        generatedStable: isRisuTtsGeneratedMessageRootStable(stable),
        className: rootDebugText(className),
      };
      if (!isRenderableDomRect(rect)) {
        record.reason = "non-renderable";
        records.push(record);
        continue;
      }
      const descriptor = await elementDescriptorTextWithParents(current, null, 1).catch(() => "");
      record.text = rootDebugText(descriptor);
      const collected = await collectSpeakerButtonsForRootCandidate(current, rect, targetHash ? knownButtons : []).catch(() => ({ buttons: [], source: "query" }));
      const speakerButtons = collected.buttons || [];
      record.source = collected.source;
      record.speakerButtons = speakerButtons.length;
      if (speakerButtons.length < 2) {
        record.reason = "speaker<2";
        records.push(record);
        continue;
      }
      if (looksLikeReadAllForbiddenRootText(descriptor) && collected.source !== "geometry") {
        record.reason = "forbidden";
        records.push(record);
        continue;
      }
      for (const speakerButton of speakerButtons) {
        const hash = await getButtonContentHash(speakerButton).catch(() => "");
        if (targetHash && hash === targetHash) record.sameHashCount += 1;
        else if (targetHash && hash) record.otherHashCount += 1;
      }
      if (targetHash && record.sameHashCount < 2) {
        record.reason = "sameHash<2";
        records.push(record);
        continue;
      }
      if (targetHash && record.otherHashCount > Math.max(3, record.sameHashCount)) {
        record.reason = "mixed-hash";
        records.push(record);
        continue;
      }
      const controls = await elementActionControls(current).catch(() => []);
      record.controls = controls.length;
      record.reason = "candidate";
      records.push(record);
    }
    return records;
  }

  async function logReadAllRootDiagnostics(contentHash, buttons, visibleButtons, placement) {
    if (!contentHash || !Array.isArray(buttons) || !buttons.length) return;
    if (!shouldLogReadAllRootDebug(contentHash, placement)) return;
    const anchorButton = (Array.isArray(visibleButtons) && visibleButtons[0]) || buttons[0];
    const anchorRect = await elementRect(anchorButton).catch(() => null);
    const records = await collectReadAllRootDebugRecords(anchorButton, contentHash, buttons).catch(() => []);
    addRuntimeLog("전체 읽기 메시지 루트 진단", {
      contentHash,
      placement,
      buttonCount: buttons.length,
      visibleButtonCount: Array.isArray(visibleButtons) ? visibleButtons.length : 0,
      anchor: summarizeDomRect(anchorRect),
      records: records.slice(0, 8),
    });
  }

  async function isButtonForContentHash(button, contentHash) {
    const hash = await getElementAttribute(button, "x-risutts-content", "data-risutts-content").catch(() => "");
    return hash === contentHash;
  }

  async function createReadAllButtonElement(contentHash, placement = READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP) {
    if (!rootDoc || typeof rootDoc.createElement !== "function") return null;
    const button = await rootDoc.createElement("button");
    if (!button) return null;
    const classToken = readAllClassToken(contentHash);
    const state = readAllVisualStateForHash(contentHash);
    const safePlacement = READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP;
    await button.setClassName(`risutts-read-all x-risu-risutts-read-all risutts-read-all-${classToken} x-risu-risutts-read-all-${classToken}`).catch(() => {});
    await button.setAttribute("type", "button").catch(() => {});
    await button.setAttribute("name", "risutts-read-all").catch(() => {});
    await button.setAttribute("value", contentHash).catch(() => {});
    await button.setAttribute("aria-label", "RisuTTS 전체 읽기").catch(() => {});
    await button.setAttribute("title", "RisuTTS 전체 읽기").catch(() => {});
    await button.setAttribute("data-risutts-role", "read-all").catch(() => {});
    await button.setAttribute("data-risu-risutts-role", "read-all").catch(() => {});
    await button.setAttribute("x-risutts-read-all", contentHash).catch(() => {});
    await button.setAttribute("data-risutts-read-all", contentHash).catch(() => {});
    await button.setAttribute("x-risu-risutts-read-all", contentHash).catch(() => {});
    await button.setAttribute("data-risu-risutts-read-all", contentHash).catch(() => {});
    await button.setAttribute("x-risutts-content", contentHash).catch(() => {});
    await button.setAttribute("data-risutts-content", contentHash).catch(() => {});
    await button.setAttribute("x-risu-risutts-content", contentHash).catch(() => {});
    await button.setAttribute("data-risu-risutts-content", contentHash).catch(() => {});
    await button.setAttribute("x-risutts-read-all-state", state).catch(() => {});
    await button.setAttribute("x-risutts-hidden", "false").catch(() => {});
    await button.setAttribute("x-risutts-read-all-placement", safePlacement).catch(() => {});
    await button.setAttribute("data-risutts-read-all-placement", safePlacement).catch(() => {});
    await button.setAttribute("x-risu-risutts-read-all-placement", safePlacement).catch(() => {});
    await button.setAttribute("data-risu-risutts-read-all-placement", safePlacement).catch(() => {});
    await setElementStyleAttribute(button, await readAllButtonStyleForState(button, state)).catch(() => {});
    try {
      if (typeof button.setInnerHTML === "function") {
        await button.setInnerHTML(state === "busy" ? "■" : RISUTTS_READ_ALL_ICON);
      } else {
        await button.setTextContent(state === "busy" ? "■" : "▶");
      }
    } catch {
      await button.setTextContent(state === "busy" ? "■" : "▶").catch(() => {});
    }
    return button;
  }

  async function firstSpeakerInsertionTarget(button) {
    try {
      const parent = typeof button.getParent === "function" ? await button.getParent() : null;
      const className = parent ? await getElementClassName(parent) : "";
      const parentRect = parent ? await elementRect(parent).catch(() => null) : null;
      if (/\brisutts-wrap\b/.test(String(className || "")) && isRenderableDomRect(parentRect)) return parent;
    } catch {
      // Use the button itself if the wrapper cannot be inspected.
    }
    return button;
  }

  async function insertReadAllButtonNearSpeaker(contentHash, speakerButton) {
    const safePlacement = READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP;
    if (!contentHash || !speakerButton) {
      addRuntimeLog("전체 읽기 버튼 배치 실패", {
        method: "first-speaker-left",
        contentHash,
        placement: safePlacement,
        stage: "input",
        reason: !contentHash ? "contentHash가 없습니다." : "첫 번째 스피커 버튼이 없습니다.",
      });
      return false;
    }
    const speakerPayloadId = await getButtonPayloadId(speakerButton).catch(() => "");
    const target = await firstSpeakerInsertionTarget(speakerButton).catch(() => speakerButton) || speakerButton;
    const [speakerRect, targetRect] = await Promise.all([
      elementRect(speakerButton).catch(() => null),
      elementRect(target).catch(() => null),
    ]);
    const anchorSummary = await summarizeSpeakerAnchorForReadAllLog(speakerButton, target).catch(() => null);
    if (!isRenderableViewportRect(speakerRect) || !isRenderableDomRect(targetRect)) {
      addRuntimeLog("전체 읽기 버튼 배치 실패", {
        method: "first-speaker-left",
        contentHash,
        placement: safePlacement,
        stage: "anchor",
        reason: !isRenderableViewportRect(speakerRect)
          ? "첫 번째 스피커 버튼이 현재 화면에서 렌더링되지 않았습니다."
          : "삽입 대상이 렌더링 가능한 DOM rect를 갖지 못했습니다.",
        anchor: anchorSummary,
      });
      return false;
    }
    const existingButtons = await findReadAllButtonsByContentHash(contentHash).catch(() => []);
    let existingNearButton = null;
    for (const button of existingButtons) {
      const placement = String(await getElementAttribute(
        button,
        "x-risutts-read-all-placement",
        "data-risutts-read-all-placement",
        "x-risu-risutts-read-all-placement",
        "data-risu-risutts-read-all-placement"
      ).catch(() => "") || "").toLowerCase();
      if (placement && placement !== safePlacement) continue;
      if (await isReadAllButtonHidden(button).catch(() => false)) continue;
      if (await isReadAllButtonLeftOfSpeaker(button, speakerButton).catch(() => false)) {
        existingNearButton = button;
        break;
      }
    }
    if (existingNearButton) {
      const existingSummaries = [];
      for (const button of existingButtons.slice(0, 6)) {
        existingSummaries.push(await summarizeReadAllButtonForReadAllLog(button, speakerButton).catch(() => null));
      }
      await retargetReadAllButton(existingNearButton, contentHash, safePlacement).catch(() => {});
      for (const button of existingButtons) {
        if (button !== existingNearButton) await hideReadAllButton(button).catch(() => {});
      }
      addRuntimeLog("전체 읽기 버튼 재사용", {
        method: "first-speaker-left",
        contentHash,
        placement: safePlacement,
        existingCount: existingButtons.length,
        kept: await summarizeReadAllButtonForReadAllLog(existingNearButton, speakerButton).catch(() => null),
        existingSamples: existingSummaries.filter(Boolean),
        anchor: anchorSummary,
      });
      await bindReadAllButtons().catch(() => {});
      return true;
    }
    const elementButton = await createReadAllButtonElement(contentHash, safePlacement).catch(() => null);
    const elementInserted = elementButton
      ? await insertElementAdjacentToElement(target, "beforebegin", elementButton).catch(() => false)
      : false;
    if (!elementInserted) {
      addRuntimeLog("전체 읽기 버튼 배치 실패", {
        method: "first-speaker-left",
        contentHash,
        placement: safePlacement,
        stage: "insert",
        reason: "createElement + target.before() 삽입에 실패했습니다. 스피커 래퍼 innerHTML fallback은 중복/오작동 방지를 위해 사용하지 않습니다.",
        anchor: anchorSummary,
        preservedExistingCount: existingButtons.length,
        elementCreated: Boolean(elementButton),
        elementInserted,
      });
      await bindReadAllButtons().catch(() => {});
      return false;
    }
    const speakerForVerify = speakerPayloadId
      ? await findButtonByPayloadId(speakerPayloadId).catch(() => null) || speakerButton
      : speakerButton;
    const matches = await findReadAllButtonsByContentHash(contentHash).catch(() => []);
    let button = elementInserted ? elementButton : null;
    for (const candidate of matches) {
      const placement = await getElementAttribute(
        candidate,
        "x-risutts-read-all-placement",
        "data-risutts-read-all-placement",
        "x-risu-risutts-read-all-placement",
        "data-risu-risutts-read-all-placement"
      ).catch(() => "");
      if (String(placement || "").toLowerCase() !== safePlacement) continue;
      if (await isReadAllButtonHidden(candidate).catch(() => false)) continue;
      if (!(await isReadAllButtonLeftOfSpeaker(candidate, speakerForVerify).catch(() => false))) continue;
      button = candidate;
      break;
    }
    if (!button || !(await isReadAllButtonLeftOfSpeaker(button, speakerForVerify).catch(() => false))) {
      const matchSummaries = [];
      for (const candidate of matches.slice(0, 8)) {
        matchSummaries.push(await summarizeReadAllButtonForReadAllLog(candidate, speakerForVerify).catch(() => null));
      }
      addRuntimeLog("전체 읽기 버튼 배치 실패", {
        method: "first-speaker-left",
        contentHash,
        placement: safePlacement,
        stage: "verify",
        reason: "삽입 후 전체 읽기 버튼이 첫 스피커 왼쪽의 클릭 가능한 위치로 검증되지 않았습니다.",
        elementInserted,
        matches: matches.length,
        matchSamples: matchSummaries.filter(Boolean),
        anchor: anchorSummary,
      });
      return false;
    }
    await retargetReadAllButton(button, contentHash, safePlacement).catch(() => {});
    for (const candidate of matches) {
      if (candidate !== button) await hideReadAllButton(candidate).catch(() => {});
    }
    rememberReadAllInsert(contentHash, button);
    const [nextTargetRect, targetDescriptor, buttonRect, verifySpeakerRect] = await Promise.all([
      elementRect(target).catch(() => null),
      elementDescriptorTextWithParents(target, null, 1).catch(() => ""),
      button ? elementRect(button).catch(() => null) : Promise.resolve(null),
      speakerForVerify ? elementRect(speakerForVerify).catch(() => null) : Promise.resolve(null),
    ]);
    addRuntimeLog("전체 읽기 버튼 삽입", {
      method: "first-speaker-left",
      contentHash,
      placement: safePlacement,
      targetMode: target === speakerButton ? "speaker-button" : "speaker-wrapper",
      target: summarizeToolbarCandidate(nextTargetRect, targetDescriptor, 0),
      button: summarizeToolbarCandidate(buttonRect, "read-all", 0),
      insertMode: "before",
      relation: readAllLeftOfSpeakerRelation(buttonRect, verifySpeakerRect || speakerRect),
      existingCount: existingButtons.length,
      matchedAfterInsert: matches.length,
      anchor: anchorSummary,
    });
    await bindReadAllButtons().catch(() => {});
    return true;
  }

  async function insertElementAdjacentToElement(target, position, element) {
    if (!target || !element) return false;
    try {
      if (position === "beforebegin" && typeof target.before === "function") {
        await target.before(element);
        return true;
      }
    } catch {
      // Fall through to after().
    }
    try {
      if (position === "afterend" && typeof target.after === "function") {
        await target.after(element);
        return true;
      }
    } catch {
      // No supported adjacent element insertion method.
    }
    return false;
  }

  async function insertReadAllButtonNearFirstSpeaker(contentHash, firstSpeakerButton) {
    return insertReadAllButtonNearSpeaker(contentHash, firstSpeakerButton);
  }

  async function insertReadAllButtonForGroup(contentHash, buttons, options = {}) {
    const scanEpoch = Number.isFinite(Number(options.scanEpoch)) ? Number(options.scanEpoch) : null;
    const insertStillCurrent = () => scanEpoch == null || isDomScanEpochCurrent(scanEpoch);
    if (!insertStillCurrent()) return false;
    if (!config.globalNarrationEnabled || !config.readAllButtonEnabled || !contentHash || !buttons.length) return false;
    const visibleButtons = await visibleSpeakerButtonsForReadAll(buttons).catch(() => []);
    if (!insertStillCurrent()) return false;
    const firstButton = visibleButtons[0] || buttons[0];
    const existingReadAllButtons = await findReadAllButtonsByContentHash(contentHash).catch(() => []);
    if (existingReadAllButtons.length) {
      const scored = [];
      for (const button of existingReadAllButtons) {
        const [hidden, rect, leftOfFirst] = await Promise.all([
          isReadAllButtonHidden(button).catch(() => false),
          elementRect(button).catch(() => null),
          isReadAllButtonLeftOfSpeaker(button, firstButton).catch(() => false),
        ]);
        const renderable = isRenderableViewportRect(rect);
        if (hidden || !renderable) continue;
        scored.push({
          button,
          hidden,
          renderable,
          leftOfFirst,
          score: (leftOfFirst ? 80 : 0)
            + (renderable ? 40 : 0)
            + (!hidden ? 20 : 0),
        });
      }
      scored.sort((a, b) => b.score - a.score);
      const keptButton = scored[0]?.button || null;
      if (keptButton) {
        await reviveReadAllButton(keptButton).catch(() => {});
        await retargetReadAllButton(keptButton, contentHash, READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP).catch(() => {});
        await bindReadAllButtons({ scanEpoch }).catch(() => {});
        addRuntimeLog("전체 읽기 버튼 재사용", {
          method: "existing-read-all",
          contentHash,
          existingCount: existingReadAllButtons.length,
          kept: await summarizeReadAllButtonForReadAllLog(keptButton, firstButton).catch(() => null),
          relation: await (async () => {
            const [buttonRect, speakerRect] = await Promise.all([
              elementRect(keptButton).catch(() => null),
              elementRect(firstButton).catch(() => null),
            ]);
            return readAllLeftOfSpeakerRelation(buttonRect, speakerRect);
          })().catch(() => null),
        });
        return true;
      }
    }
    if (readAllInsertLocks.has(contentHash)) {
      addRuntimeLog("전체 읽기 버튼 배치 생략", {
        method: "first-speaker-left",
        contentHash,
        stage: "lock",
        reason: "같은 contentHash의 전체 읽기 버튼 배치가 이미 진행 중입니다.",
        buttonCount: buttons.length,
        visibleButtonCount: visibleButtons.length,
      });
      return true;
    }
    readAllInsertLocks.add(contentHash);
    try {
      const placement = configuredReadAllButtonPlacement();
      const rememberedPayloadCount = (readAllPayloadsByHash.get(contentHash) || []).length;
      addRuntimeLog("전체 읽기 버튼 배치 후보", {
        method: "first-speaker-left",
        contentHash,
        placement,
        scanEpoch,
        buttonCount: buttons.length,
        visibleButtonCount: visibleButtons.length,
        hiddenButtonCount: Math.max(0, buttons.length - visibleButtons.length),
        rememberedPayloadCount,
        firstAnchor: await summarizeSpeakerAnchorForReadAllLog(firstButton).catch(() => null),
      });
      if (placement !== READ_ALL_BUTTON_PLACEMENT_MESSAGE_TOP) {
        addRuntimeLog("전체 읽기 버튼 배치 실패", {
          method: "first-speaker-left",
          contentHash,
          placement,
          stage: "placement",
          reason: "현재 개발 버전은 첫 번째 개별 스피커 왼쪽 배치만 지원합니다.",
        });
        return false;
      }
      if (await insertReadAllButtonNearFirstSpeaker(contentHash, firstButton).catch(() => false)) return true;
      if (!insertStillCurrent()) return false;
      addRuntimeLog("전체 읽기 버튼 위치 탐색 실패", {
        method: "first-speaker-left",
        contentHash,
        placement,
        buttonCount: buttons.length,
        visibleButtonCount: visibleButtons.length,
        reason: "가장 위쪽 개별 스피커 왼쪽에 전체 읽기 버튼을 배치하지 못했습니다.",
      });
      return false;
    } finally {
      readAllInsertLocks.delete(contentHash);
    }
  }

  async function hideReadAllButtons() {
    const buttons = await collectRisuTtsReadAllButtons();
    for (const button of buttons) {
      await hideReadAllButton(button).catch(() => {});
    }
  }

  function addReadAllDecorateDebugLog(reason, details = {}) {
    const now = Date.now();
    if (now - lastReadAllDecorateDebugAt < 2500) return;
    lastReadAllDecorateDebugAt = now;
    addRuntimeLog("전체 읽기 버튼 스캔", {
      reason,
      globalNarrationEnabled: Boolean(config.globalNarrationEnabled),
      lastButtonScanStatus,
      ...details,
    });
  }

  async function readAllMessageGroupKey(contentHash, buttons) {
    const allButtons = Array.isArray(buttons) ? buttons : [];
    let anchorButton = allButtons[0] || null;
    for (const button of allButtons) {
      if (await isVisibleSpeakerButtonForReadAll(button).catch(() => false)) {
        anchorButton = button;
        break;
      }
    }
    if (!contentHash || !anchorButton) return `content:${contentHash || "unknown"}`;
    const rootInfo = await findReadAllMessageRoot(anchorButton, contentHash, allButtons).catch(() => null)
      || await findReadAllMessageRoot(anchorButton, "").catch(() => null)
      || await findLooseReadAllMessageRoot(anchorButton).catch(() => null);
    if (rootInfo?.key) return `message-root:${rootInfo.key}`;

    const bounds = await readAllGroupBounds(buttons).catch(() => null);
    if (isRenderableViewportRect(bounds)) {
      const left = Math.round((bounds.left || 0) / 48) * 48;
      const top = Math.round((bounds.top || 0) / 240) * 240;
      return `visual:${left}:${top}`;
    }
    return `content:${contentHash}`;
  }

  function uniquePayloadList(payloadList) {
    const seen = new Set();
    const result = [];
    for (const payload of payloadList || []) {
      if (!payload || !payload.sourceText || !payload.mode) continue;
      const key = [
        payload.id || "",
        payload.contentHash || "",
        payload.segmentIndex || 0,
        payload.mode || "",
        payload.sourceText || "",
        payload.speakerName || "",
        payload.speakerCueGender || "",
        payload.segmentKind || "",
      ].join("\u0001");
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(payload);
    }
    return result;
  }

  function rememberReadAllPayloadList(contentHash, payloadList) {
    if (!contentHash) return;
    const list = uniquePayloadList(payloadList);
    if (!list.length) return;
    readAllPayloadsByHash.set(contentHash, list);
    if (readAllPayloadsByHash.size > 120) {
      const firstKey = readAllPayloadsByHash.keys().next().value;
      if (firstKey) readAllPayloadsByHash.delete(firstKey);
    }
  }

  function rememberReadAllSyntheticSegments(contentHash, payloadList) {
    if (!contentHash) return;
    const payloadsForHash = uniquePayloadList(payloadList);
    rememberReadAllPayloadList(contentHash, payloadsForHash);
    const segments = payloadsForHash.map((payload, index) => ({
      index,
      mode: payload.mode || "",
      text: payload.sourceText || "",
      speakerName: payload.speakerName || "",
      speakerCueGender: payload.speakerCueGender || "",
      segmentKind: payload.segmentKind || "line",
    }));
    rememberContentSegments(contentHash, segments);
  }

  async function resolveSpeakerButtonFromEvent(event = null, expectedPayloadId = "") {
    const eventPayloadId = await getEventTargetPayloadId(event).catch(() => "");
    let pointButton = await findButtonFromEventPoint(event).catch(() => null);
    let pointPayloadId = "";
    if (pointButton) {
      pointPayloadId = await getButtonPayloadId(pointButton, { allowSlowFallback: false }).catch(() => "");
      if (!pointPayloadId) pointPayloadId = await getButtonPayloadId(pointButton).catch(() => "");
    }
    if (!pointPayloadId) {
      const visibleByPoint = await findVisibleSpeakerButtonFromEventPoint(event).catch(() => null);
      if (visibleByPoint?.button && visibleByPoint?.payloadId) {
        pointButton = visibleByPoint.button;
        pointPayloadId = visibleByPoint.payloadId;
      }
    }
    const wantedPayloadId = expectedPayloadId || eventPayloadId || pointPayloadId;
    if (expectedPayloadId && eventPayloadId && eventPayloadId !== expectedPayloadId) {
      return {
        button: null,
        payloadId: eventPayloadId,
        eventPayloadId,
        pointPayloadId,
        reason: "이벤트 payload가 바인딩된 스피커와 다릅니다.",
      };
    }
    if (expectedPayloadId && pointPayloadId && pointPayloadId !== expectedPayloadId) {
      return {
        button: null,
        payloadId: pointPayloadId,
        eventPayloadId,
        pointPayloadId,
        reason: "클릭 위치의 스피커가 바인딩된 스피커와 다릅니다.",
      };
    }
    if (pointButton && pointPayloadId && (!wantedPayloadId || pointPayloadId === wantedPayloadId)) {
      return {
        button: pointButton,
        payloadId: pointPayloadId,
        eventPayloadId,
        pointPayloadId,
        reason: "",
      };
    }
    if (wantedPayloadId) {
      const visible = await findVisibleButtonByPayloadId(wantedPayloadId).catch(() => null);
      if (visible) {
        return {
          button: visible,
          payloadId: wantedPayloadId,
          eventPayloadId,
          pointPayloadId,
          reason: "",
        };
      }
    }
    return {
      button: null,
      payloadId: wantedPayloadId,
      eventPayloadId,
      pointPayloadId,
      reason: "클릭 위치의 실제 스피커 버튼을 찾지 못했습니다.",
    };
  }

  async function collectVisibleSpeakerButtonsFast(limit = EVENT_POINT_SPEAKER_SCAN_LIMIT) {
    if (!rootDoc) return [];
    const selectors = [
      "button[data-risutts-id]",
      "button[x-risutts-id]",
      "button[data-risu-risutts-id]",
      "button[x-risu-risutts-id]",
      "button.risutts-action",
      "button.x-risu-risutts-action",
      "button[class*='risutts-payload-']",
      "button[value^='rt_']",
    ];
    const candidates = [];
    const seenElements = new Set();
    const seenCandidateKeys = new Set();
    for (const selector of selectors) {
      let elements = [];
      try {
        if (typeof rootDoc.querySelectorAll === "function") {
          elements = await api.unwarpSafeArray(await rootDoc.querySelectorAll(selector));
        }
        if (!elements.length) {
          const element = await rootDoc.querySelector(selector);
          if (element) elements = [element];
        }
      } catch {
        elements = [];
      }
      for (const element of elements) {
        if (!element || seenElements.has(element)) continue;
        seenElements.add(element);
        const rect = await elementRect(element).catch(() => null);
        if (!isRenderableViewportRect(rect)) continue;
        const payloadId = await getButtonPayloadId(element, { allowSlowFallback: false }).catch(() => "");
        if (!payloadId) continue;
        const candidateKey = visibleSpeakerCandidateKey(payloadId, rect);
        if (candidateKey && seenCandidateKeys.has(candidateKey)) continue;
        if (candidateKey) seenCandidateKeys.add(candidateKey);
        candidates.push({ button: element, payloadId, rect });
        if (candidates.length >= limit) return candidates;
      }
    }
    return candidates;
  }

  async function findVisibleSpeakerButtonFromEventPoint(event = null, padSize = 6) {
    const point = eventPointerPoint(event);
    if (!point) return null;
    const candidates = await collectVisibleSpeakerButtonsFast(EVENT_POINT_SPEAKER_SCAN_LIMIT).catch(() => []);
    for (const candidate of candidates) {
      if (pointInsideViewportRect(point, candidate.rect, padSize)) return candidate;
    }
    return null;
  }

  async function safeSetElementAttribute(element, name, value) {
    if (!element || typeof element.setAttribute !== "function") return;
    try {
      const result = element.setAttribute(name, value);
      if (result && typeof result.catch === "function") {
        await result.catch(() => {});
      }
    } catch {
      // Native DOM nodes and Risu wrappers expose slightly different setter shapes.
    }
  }

  async function applyButtonRingFrame(button, angle) {
    await safeSetElementAttribute(button, "data-risutts-active", "true");
  }

  function stopButtonRing(button) {
    const timer = buttonRingTimers.get(button);
    if (timer) clearInterval(timer);
    buttonRingTimers.delete(button);
  }

  async function startButtonRing(button) {
    stopButtonRing(button);
    await applyButtonRingFrame(button, 0);
  }

  async function setButtonState(button, state, mode) {
    if (!button) return;
    await safeSetElementAttribute(button, "x-risutts-state", state);
    await safeSetElementAttribute(button, "aria-busy", state === "busy" ? "true" : "false");
    if (state === "busy") {
      await startButtonRing(button);
    } else {
      stopButtonRing(button);
      await safeSetElementAttribute(button, "data-risutts-active", "false");
    }
  }

  async function setReadAllButtonState(button, state) {
    if (!button) return;
    await button.setAttribute("x-risutts-read-all-state", state).catch(() => {});
    await button.setAttribute("x-risu-risutts-read-all-state", state).catch(() => {});
    await button.setAttribute("data-risutts-read-all-state", state).catch(() => {});
    await button.setAttribute("data-risu-risutts-read-all-state", state).catch(() => {});
    await button.setAttribute("x-risutts-hidden", "false").catch(() => {});
    await button.setAttribute("x-risu-risutts-hidden", "false").catch(() => {});
    await button.setAttribute("data-risutts-hidden", "false").catch(() => {});
    await button.setAttribute("data-risu-risutts-hidden", "false").catch(() => {});
    await setElementStyleAttribute(button, await readAllButtonStyleForState(button, state)).catch(() => {});
    try {
      if (typeof button.setInnerHTML === "function") {
        await button.setInnerHTML(state === "busy" ? "■" : RISUTTS_READ_ALL_ICON);
      }
    } catch {
      // Some DOM wrappers expose attributes only; state attrs still carry the status.
    }
  }

  async function setReadAllButtonsState(contentHash, state, options = {}) {
    if (!contentHash) return;
    const directButton = options?.button || null;
    if (directButton) {
      const directHash = await getReadAllContentHash(directButton).catch(() => "");
      if (directHash === contentHash || readAllClassToken(directHash) === readAllClassToken(contentHash)) {
        await setReadAllButtonState(directButton, state).catch(() => {});
      }
      if (options?.sync === false) return;
    }
    const buttons = await collectRisuTtsReadAllButtons();
    for (const button of buttons) {
      const hash = await getReadAllContentHash(button).catch(() => "");
      if (hash === contentHash || readAllClassToken(hash) === readAllClassToken(contentHash)) {
        await setReadAllButtonState(button, state).catch(() => {});
      }
    }
  }

  async function keepActiveReadAllButtonsBusy(contentHash) {
    if (!contentHash || activeReadAllContentHash !== contentHash) return;
    await setReadAllButtonsState(contentHash, "busy").catch(() => {});
  }

  function rememberedPayloadsForContentHash(contentHash) {
    if (!contentHash) return [];
    return (contentSegmentsByHash.get(contentHash) || [])
      .filter((segment) => segment && segment.text && segment.mode)
      .map((segment) => {
        const options = {
          speakerName: segment.speakerName || "",
          speakerCueGender: segment.speakerCueGender || "",
          segmentKind: segment.segmentKind || "line",
        };
        const payloadId = createPayload(segment.text, segment.mode, contentHash, segment.index || 0, options);
        return payloads.get(payloadId) || {
          id: payloadId,
          mode: segment.mode,
          sourceText: segment.text,
          contentHash,
          segmentIndex: Number(segment.index || 0),
          speakerName: options.speakerName,
          speakerCueGender: options.speakerCueGender,
          segmentKind: options.segmentKind,
          createdAt: Date.now(),
        };
      });
  }

  async function readAllPayloadsFromButtons(contentHash, buttons) {
    if (!contentHash) return [];
    const fromReadAllMemory = readAllPayloadsByHash.get(contentHash);
    if (Array.isArray(fromReadAllMemory) && fromReadAllMemory.length) {
      return uniquePayloadList(fromReadAllMemory)
        .sort((a, b) => Number(a.segmentIndex || 0) - Number(b.segmentIndex || 0));
    }

    const fromMemory = rememberedPayloadsForContentHash(contentHash);
    const fromButtons = [];
    for (const button of buttons || []) {
      if (!(await isSpeakerButtonForReadAllGrouping(button).catch(() => false))) continue;
      const hash = await getButtonContentHash(button).catch(() => "");
      if (hash !== contentHash) continue;
      const payloadId = await getButtonPayloadId(button).catch(() => "");
      const payload = payloadId ? (payloads.get(payloadId) || await payloadFromButton(button, payloadId)) : null;
      if (payload) fromButtons.push(payload);
    }

    return [...fromMemory, ...fromButtons]
      .filter((payload, index, list) => list.findIndex((item) => item.id === payload.id) === index)
      .sort((a, b) => Number(a.segmentIndex || 0) - Number(b.segmentIndex || 0));
  }

  async function readAllPayloadsForContentHash(contentHash) {
    if (!contentHash) return [];
    const fromReadAllMemory = readAllPayloadsByHash.get(contentHash);
    if (Array.isArray(fromReadAllMemory) && fromReadAllMemory.length) {
      return uniquePayloadList(fromReadAllMemory)
        .sort((a, b) => Number(a.segmentIndex || 0) - Number(b.segmentIndex || 0));
    }
    const fromMemory = rememberedPayloadsForContentHash(contentHash);
    if (fromMemory.length) return fromMemory;
    const buttons = await collectRisuTtsButtons({ source: "read-all-payloads" });
    return readAllPayloadsFromButtons(contentHash, buttons);
  }

  async function visibleReadAllGroups() {
    const buttons = await collectRisuTtsButtons({ source: "visible-read-all-groups" });
    const groups = new Map();
    for (const button of buttons) {
      if (!(await isVisibleSpeakerButtonForReadAll(button).catch(() => false))) continue;
      const contentHash = await getButtonContentHash(button).catch(() => "");
      if (!contentHash) continue;
      const rect = await elementRect(button).catch(() => null);
      if (!isRenderableViewportRect(rect)) continue;
      const current = groups.get(contentHash) || {
        contentHash,
        count: 0,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
      current.count += 1;
      current.left = Math.min(current.left, rect.left);
      current.right = Math.max(current.right, rect.right);
      current.top = Math.min(current.top, rect.top);
      current.bottom = Math.max(current.bottom, rect.bottom);
      groups.set(contentHash, current);
    }
    return Array.from(groups.values());
  }

  async function readAllContentHashFromPoint(point) {
    if (!point) return "";
    const groups = await visibleReadAllGroups();
    const candidates = [];
    for (const group of groups) {
      if (!group.contentHash || group.count <= 0) continue;
      const verticalPadTop = 190;
      const verticalPadBottom = 80;
      if (point.y < group.top - verticalPadTop || point.y > group.bottom + verticalPadBottom) continue;
      const yDistance = point.y < group.top
        ? group.top - point.y
        : (point.y > group.bottom ? point.y - group.bottom : 0);
      const xDistance = point.x > group.right
        ? point.x - group.right
        : (point.x < group.left ? group.left - point.x : 0);
      candidates.push({
        ...group,
        score: (yDistance * 12) + xDistance - Math.min(group.count, 8) * 6,
      });
    }
    candidates.sort((a, b) => a.score - b.score);
    const chosen = candidates[0];
    addRuntimeLog(chosen ? "전체 읽기 채팅 버튼 대상" : "전체 읽기 채팅 버튼 대상 없음", {
      point: `${Math.round(point.x)}, ${Math.round(point.y)}`,
      chosen: chosen ? chosen.contentHash : "",
      candidateCount: candidates.length,
    });
    return chosen?.contentHash || "";
  }

  function shouldAcceptReadAllActivation(contentHash) {
    const key = contentHash || "unknown";
    const now = Date.now();
    const last = readAllActivationTimes.get(key) || 0;
    const active = activeReadAllContentHash === key;
    if (active && now < activeReadAllStopAllowedAt) return false;
    if (active && now - last < 800) return false;
    if (!active && now - last < 1200) return false;
    readAllActivationTimes.set(key, now);
    for (const [id, time] of readAllActivationTimes.entries()) {
      if (now - time > 5000) readAllActivationTimes.delete(id);
    }
    return true;
  }

  function readAllPayloadIdForPlayback(payload, contentHash) {
    return payload.id || createPayload(payload.sourceText, payload.mode, contentHash, payload.segmentIndex || 0, {
      speakerName: payload.speakerName || "",
      speakerCueGender: payload.speakerCueGender || "",
      segmentKind: payload.segmentKind || "line",
    });
  }

  async function shouldContinueReadAllPlayback(playbackRequestId, sequenceId, contentHash, ownerBotId, trigger) {
    if (
      playbackRequestId !== latestChatPlaybackRequestId
      || activeReadAllSequenceId !== sequenceId
      || activeReadAllContentHash !== contentHash
      || activeReadAllOwnerBotId !== ownerBotId
    ) {
      return false;
    }
    return await ensureReadAllOwnerStillCurrent(ownerBotId, contentHash, sequenceId, trigger);
  }

  async function prepareReadAllPayloadPlayback(payload, payloadId, context) {
    const { contentHash, ownerBotId, sequenceId, playbackRequestId, source, payloadIndex } = context;
    const metrics = {
      contentHash,
      payloadId,
      payloadIndex: Number.isFinite(Number(payloadIndex)) ? Number(payloadIndex) : "",
      segmentIndex: Number.isFinite(Number(payload.segmentIndex)) ? Number(payload.segmentIndex) : 0,
      source: source || "read-all",
      sourceMode: payload.mode || "",
      sourceChars: String(payload.sourceText || "").length,
      translationMs: 0,
      translationCacheHit: false,
    };
    let textForTts = payload.sourceText;
    if (payload.mode === "ko" || payload.mode === "en") {
      const translationStartedAt = monotonicNow();
      textForTts = await translateToJapanese(payload.sourceText, payload.mode, { metrics });
      metrics.translationMs = elapsedMsSince(translationStartedAt);
      metrics.translatedChars = String(textForTts || "").length;
      addRuntimeLog("전체 읽기 번역 완료", {
        payloadId,
        sourceMode: payload.mode,
        sourceText: payload.sourceText,
        translatedText: textForTts,
        source: source || "read-all",
        elapsedMs: metrics.translationMs,
        cacheHit: Boolean(metrics.translationCacheHit),
      });
    } else {
      metrics.translatedChars = String(textForTts || "").length;
    }
    if (!await shouldContinueReadAllPlayback(playbackRequestId, sequenceId, contentHash, ownerBotId, "전체 읽기 TTS 준비 전 확인")) {
      metrics.state = "superseded";
      return { state: "superseded", payloadId, textForTts, metrics };
    }
    const prepared = await prepareTtsPlaybackEntry(textForTts, { ...payload, id: payloadId }, {
      metrics,
      shouldPlay: async () => await shouldContinueReadAllPlayback(
        playbackRequestId,
        sequenceId,
        contentHash,
        ownerBotId,
        "전체 읽기 TTS 생성 직전 확인"
      ),
    });
    metrics.state = prepared?.state || "ready";
    return { state: prepared?.state || "ready", payloadId, textForTts, prepared, metrics };
  }

  async function prepareReadAllPayloadPlaybackWithRetry(payload, payloadId, context, options = {}) {
    const maxAttempts = Math.max(1, Math.floor(Number(options.maxAttempts || 1)));
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await prepareReadAllPayloadPlayback(payload, payloadId, context);
      } catch (error) {
        lastError = error;
        const delayMs = attempt < maxAttempts
          ? retryDelayMsFromError(error, READ_ALL_RETRY_DELAY_FALLBACK_MS)
          : 0;
        if (!delayMs) break;
        addRuntimeLog("전체 읽기 준비 재시도 대기", {
          contentHash: context.contentHash || "",
          payloadId,
          payloadIndex: Number.isFinite(Number(context.payloadIndex)) ? Number(context.payloadIndex) : "",
          segmentIndex: Number.isFinite(Number(payload.segmentIndex)) ? Number(payload.segmentIndex) : 0,
          source: context.source || "",
          attempt,
          nextAttempt: attempt + 1,
          maxAttempts,
          delayMs,
          error: describeError(error),
        });
        const canWait = await shouldContinueReadAllPlayback(
          context.playbackRequestId,
          context.sequenceId,
          context.contentHash,
          context.ownerBotId,
          "전체 읽기 재시도 대기 전 확인"
        );
        if (!canWait) return { state: "superseded", payloadId, error };
        await sleepMs(delayMs);
        const canRetry = await shouldContinueReadAllPlayback(
          context.playbackRequestId,
          context.sequenceId,
          context.contentHash,
          context.ownerBotId,
          "전체 읽기 재시도 직전 확인"
        );
        if (!canRetry) return { state: "superseded", payloadId, error };
      }
    }
    return { state: "error", payloadId, error: lastError || new Error("전체 읽기 조각 준비에 실패했습니다.") };
  }

  function addReadAllSegmentTimingLog(record, payload, playbackState) {
    const metrics = record?.metrics || record?.prepared?.metrics || {};
    addRuntimeLog("전체 읽기 조각 시간", {
      contentHash: metrics.contentHash || payload.contentHash || "",
      payloadId: metrics.payloadId || record?.payloadId || payload.id || "",
      payloadIndex: metrics.payloadIndex,
      segmentIndex: metrics.segmentIndex,
      source: metrics.source || "",
      sourceMode: metrics.sourceMode || payload.mode || "",
      state: playbackState || metrics.playbackState || metrics.state || "",
      sourceChars: metrics.sourceChars,
      translatedChars: metrics.translatedChars,
      inputChars: metrics.inputChars,
      ttsChars: metrics.ttsChars,
      translationMs: metrics.translationMs || 0,
      translationCacheHit: Boolean(metrics.translationCacheHit),
      voiceResolveMs: metrics.voiceResolveMs || 0,
      emotionMs: metrics.emotionMs || 0,
      emotionMode: metrics.emotionMode || "",
      emotionCacheEnabled: Boolean(metrics.emotionCacheEnabled),
      emotionCacheHit: Boolean(metrics.emotionCacheHit),
      emotionCaptionUsed: Boolean(metrics.emotionCaptionUsed),
      emotionEmojiUsed: Boolean(metrics.emotionEmojiUsed),
      ttsCacheMode: metrics.ttsCacheMode || config.ttsCacheMode,
      ttsCacheHit: Boolean(metrics.ttsCacheHit),
      ttsCacheStored: Boolean(metrics.ttsCacheStored),
      ttsServerMs: metrics.ttsServerMs || 0,
      audioPrepareMs: metrics.audioPrepareMs || 0,
      audioStartMs: metrics.audioStartMs || 0,
      prepareTotalMs: metrics.prepareTotalMs || 0,
      audioBytes: metrics.audioBytes || 0,
      voice: metrics.voice || "",
      voiceSource: metrics.voiceSource || "",
    });
  }

  function disposeReadAllPreparedPlayback(record) {
    if (record?.prepared) disposePreparedTtsPlaybackEntry(record.prepared);
  }

  async function handleReadAllClick(button, contentHash) {
    if (!contentHash) return;
    if (!config.globalNarrationEnabled || !config.readAllButtonEnabled) {
      await setReadAllButtonState(button, "error");
      addRuntimeLog("전체 읽기 실패", {
        reason: config.globalNarrationEnabled
          ? "전체 읽기 버튼이 꺼져 있어 전체 읽기를 사용할 수 없습니다."
          : "글로벌 보이스가 꺼져 있어 전체 읽기를 사용할 수 없습니다.",
      });
      return;
    }
    if (activeReadAllContentHash === contentHash) {
      addRuntimeLog("전체 읽기 정지", { contentHash });
      latestChatPlaybackRequestId += 1;
      activeReadAllSequenceId += 1;
      activeReadAllContentHash = "";
      activeReadAllOwnerBotId = "";
      activeReadAllStopAllowedAt = 0;
      stopCurrentAudio();
      await setReadAllButtonsState(contentHash, "idle", { button, sync: false });
      return;
    }

    const payloadList = await readAllPayloadsForContentHash(contentHash);
    if (payloadList.length === 0) {
      await setReadAllButtonState(button, "error");
      addRuntimeLog("전체 읽기 실패", {
        contentHash,
        reason: "읽을 수 있는 대사 조각을 찾지 못했습니다.",
      });
      return;
    }

    const ownerBotId = await getCurrentPlaybackBotId();
    const sequenceId = ++activeReadAllSequenceId;
    const playbackRequestId = ++latestChatPlaybackRequestId;
    stopCurrentAudio();
    activeReadAllContentHash = contentHash;
    activeReadAllOwnerBotId = ownerBotId;
    activeReadAllStopAllowedAt = Date.now() + READ_ALL_STOP_CLICK_GUARD_MS;
    activePlaybackOwnerBotId = ownerBotId || activePlaybackOwnerBotId || "";
    await setReadAllButtonsState(contentHash, "busy", { button, sync: false });
    addRuntimeLog("전체 읽기 시작", {
      contentHash,
      count: payloadList.length,
      ownerBotId,
    });

    const readAllContext = { contentHash, ownerBotId, sequenceId, playbackRequestId };
    const prefetchAhead = Math.floor(clampNumber(
      config.readAllPrefetchAhead,
      0,
      READ_ALL_PREFETCH_AHEAD_MAX,
      DEFAULT_CONFIG.readAllPrefetchAhead,
    ));
    const preparedPlaybackByIndex = new Map();
    let prefetchCursorIndex = 0;
    let prefetchTargetIndex = -1;
    let prefetchRunning = false;
    let prefetchCancelled = false;

    const disposePreparedPlaybackPromise = (entry) => {
      if (!entry?.promise) return;
      entry.promise
        .then((record) => disposeReadAllPreparedPlayback(record))
        .catch(() => {});
    };
    const disposeAllPreparedPlaybacks = () => {
      prefetchCancelled = true;
      for (const entry of preparedPlaybackByIndex.values()) {
        disposePreparedPlaybackPromise(entry);
      }
      preparedPlaybackByIndex.clear();
    };
    const createPreparedPlaybackPromise = (payload, payloadIndex, source) => {
      const nextPayloadId = readAllPayloadIdForPlayback(payload, contentHash);
      if (!nextPayloadId) return;
      const entry = {
        payloadId: nextPayloadId,
        promise: prepareReadAllPayloadPlaybackWithRetry(payload, nextPayloadId, {
          ...readAllContext,
          source,
          payloadIndex,
        }, { maxAttempts: 1 }).catch((error) => ({
          state: "error",
          payloadId: nextPayloadId,
          error,
        })),
      };
      preparedPlaybackByIndex.set(payloadIndex, entry);
      return entry;
    };
    const startReadAllPrefetchLoop = () => {
      if (prefetchRunning || prefetchAhead <= 0) return;
      prefetchRunning = true;
      Promise.resolve().then(async () => {
        while (!prefetchCancelled && prefetchCursorIndex <= prefetchTargetIndex) {
          if (!await shouldContinueReadAllPlayback(
            playbackRequestId,
            sequenceId,
            contentHash,
            ownerBotId,
            "전체 읽기 선준비 루프 확인"
          )) break;
          const payloadIndex = prefetchCursorIndex;
          prefetchCursorIndex += 1;
          if (payloadIndex < 0 || payloadIndex >= payloadList.length || preparedPlaybackByIndex.has(payloadIndex)) continue;
          const nextPayload = payloadList[payloadIndex];
          const nextPayloadId = readAllPayloadIdForPlayback(nextPayload, contentHash);
          if (!nextPayloadId) continue;
          const entry = createPreparedPlaybackPromise(nextPayload, payloadIndex, "prefetch");
          if (!entry) continue;
          addRuntimeLog("전체 읽기 다음 조각 준비 시작", {
            contentHash,
            payloadId: nextPayloadId,
            segmentIndex: nextPayload.segmentIndex || 0,
            payloadIndex,
            prefetchAhead,
          });
          const record = await entry.promise;
          if (prefetchCancelled || activeReadAllSequenceId !== sequenceId || activeReadAllContentHash !== contentHash) {
            disposeReadAllPreparedPlayback(record);
            preparedPlaybackByIndex.delete(payloadIndex);
            break;
          }
          if (record?.state === "superseded") break;
        }
      }).catch((error) => {
        addRuntimeLog("전체 읽기 다음 조각 준비 중단", {
          contentHash,
          error: describeError(error),
        });
      }).finally(() => {
        prefetchRunning = false;
        if (!prefetchCancelled && prefetchCursorIndex <= prefetchTargetIndex) startReadAllPrefetchLoop();
      });
    };
    const scheduleReadAllPrefetchWindow = (nextPayloadIndex) => {
      if (prefetchAhead <= 0 || prefetchCancelled) return;
      if (nextPayloadIndex < 0 || nextPayloadIndex >= payloadList.length) return;
      prefetchCursorIndex = Math.max(prefetchCursorIndex, nextPayloadIndex);
      prefetchTargetIndex = Math.max(
        prefetchTargetIndex,
        Math.min(payloadList.length - 1, nextPayloadIndex + prefetchAhead - 1)
      );
      addRuntimeLog("전체 읽기 선준비 범위 갱신", {
        contentHash,
        nextPayloadIndex,
        prefetchTargetIndex,
        prefetchAhead,
        source: "window",
      });
      startReadAllPrefetchLoop();
    };

    let completedPayloadCount = 0;
    let readAllStopReason = "";
    for (let payloadIndex = 0; payloadIndex < payloadList.length; payloadIndex += 1) {
      const payload = payloadList[payloadIndex];
      if (activeReadAllSequenceId !== sequenceId || activeReadAllContentHash !== contentHash) {
        readAllStopReason = "다른 재생 요청으로 전체 읽기가 교체되었습니다.";
        break;
      }
      if (!await ensureReadAllOwnerStillCurrent(ownerBotId, contentHash, sequenceId, "전체 읽기 다음 조각 확인")) {
        readAllStopReason = "현재 화면/봇이 바뀌어 전체 읽기를 중단했습니다.";
        break;
      }
      activeReadAllStopAllowedAt = Date.now() + READ_ALL_STOP_CLICK_GUARD_MS;
      await keepActiveReadAllButtonsBusy(contentHash);
      const payloadId = readAllPayloadIdForPlayback(payload, contentHash);
      await setActiveChatButtonState(payloadId, "busy", payload.mode, { sync: false });
      try {
        let preparedRecord = null;
        const prefetchedEntry = preparedPlaybackByIndex.get(payloadIndex);
        if (prefetchedEntry?.payloadId === payloadId) {
          preparedRecord = await prefetchedEntry.promise;
          preparedPlaybackByIndex.delete(payloadIndex);
          if (preparedRecord?.state === "ready") {
            addRuntimeLog("전체 읽기 다음 조각 준비 사용", {
              contentHash,
              payloadId,
              segmentIndex: payload.segmentIndex || 0,
              payloadIndex,
            });
          } else if (preparedRecord?.state === "error") {
            const delayMs = retryDelayMsFromError(preparedRecord.error, READ_ALL_RETRY_DELAY_FALLBACK_MS);
            addRuntimeLog("전체 읽기 선준비 실패 재시도 전환", {
              contentHash,
              payloadId,
              segmentIndex: payload.segmentIndex || 0,
              payloadIndex,
              delayMs,
              error: describeError(preparedRecord.error),
              "후속 처리": "선준비 실패 결과를 버리고 실제 재생 차례에서 다시 준비합니다.",
            });
            if (delayMs) {
              const canWait = await shouldContinueReadAllPlayback(
                playbackRequestId,
                sequenceId,
                contentHash,
                ownerBotId,
                "전체 읽기 선준비 실패 대기 전 확인"
              );
              if (!canWait) {
                preparedRecord = { state: "superseded", payloadId };
              } else {
                await sleepMs(delayMs);
                const canRetry = await shouldContinueReadAllPlayback(
                  playbackRequestId,
                  sequenceId,
                  contentHash,
                  ownerBotId,
                  "전체 읽기 선준비 실패 재시도 직전 확인"
                );
                preparedRecord = canRetry ? null : { state: "superseded", payloadId };
              }
            } else {
              preparedRecord = null;
            }
          }
        }

        if (!preparedRecord) {
          preparedRecord = await prepareReadAllPayloadPlaybackWithRetry(payload, payloadId, {
            ...readAllContext,
            source: "current",
            payloadIndex,
          }, { maxAttempts: 2 });
        }
        if (preparedRecord?.state === "superseded") {
          await setActiveChatButtonState(payloadId, "idle", payload.mode, { sync: false });
          readAllStopReason = "전체 읽기 요청이 교체되었습니다.";
          break;
        }
        if (preparedRecord?.state === "error") {
          throw preparedRecord.error || new Error("전체 읽기 다음 조각 준비에 실패했습니다.");
        }

        scheduleReadAllPrefetchWindow(payloadIndex + 1);

        const playbackState = await playPreparedTtsPlaybackEntry(preparedRecord.prepared, { ...payload, id: payloadId }, {
          waitForEnd: true,
          onAudioState: (state) => {
            if (state === "playing") {
              activeReadAllStopAllowedAt = Date.now() + 500;
              keepActiveReadAllButtonsBusy(contentHash).catch(() => {});
              setActiveChatButtonState(payloadId, "busy", payload.mode, { sync: false }).catch(() => {});
              if (typeof updatePlayingHighlight === "function") updatePlayingHighlight(payloadId).catch(() => {});
            } else {
              setActiveChatButtonState(payloadId, "idle", payload.mode, { sync: false }).catch(() => {});
              if (typeof updatePlayingHighlight === "function") updatePlayingHighlight("").catch(() => {});
            }
          },
          shouldPlay: async () => await shouldContinueReadAllPlayback(
            playbackRequestId,
            sequenceId,
            contentHash,
            ownerBotId,
            "전체 읽기 재생 직전 확인"
          ),
        });
        addRuntimeLog("전체 읽기 조각 재생 상태", {
          contentHash,
          payloadId,
          segmentIndex: payload.segmentIndex || 0,
          state: playbackState,
        });
        addReadAllSegmentTimingLog(preparedRecord, { ...payload, id: payloadId }, playbackState);
        await setActiveChatButtonState(payloadId, "idle", payload.mode, { sync: false });
        if (playbackState === "ended" || playbackState === "playing") {
          completedPayloadCount = payloadIndex + 1;
        }
        if (playbackState === "stopped" || playbackState === "superseded" || playbackState === "error") {
          readAllStopReason = `재생 상태가 ${playbackState}입니다.`;
          break;
        }
        await keepActiveReadAllButtonsBusy(contentHash);
      } catch (error) {
        disposeAllPreparedPlaybacks();
        await setActiveChatButtonState(payloadId, "error", payload.mode, { sync: false });
        readAllStopReason = describeError(error);
        addRuntimeLog("전체 읽기 중단", {
          payloadId,
          error: describeError(error),
        });
        break;
      }
    }
    disposeAllPreparedPlaybacks();

    if (activeReadAllSequenceId === sequenceId && activeReadAllContentHash === contentHash) {
      activeReadAllContentHash = "";
      activeReadAllOwnerBotId = "";
      activeReadAllStopAllowedAt = 0;
      activePlaybackOwnerBotId = "";
      await setReadAllButtonsState(contentHash, "idle", { button, sync: false });
      const completed = completedPayloadCount >= payloadList.length;
      addRuntimeLog(completed ? "전체 읽기 완료" : "전체 읽기 종료", {
        contentHash,
        count: payloadList.length,
        completed: completedPayloadCount,
        reason: completed ? "" : (readAllStopReason || "전체 읽기가 끝까지 진행되지 않았습니다."),
      });
    }
  }

  async function activateReadAllButton(button, event = null, explicitContentHash = "") {
    const contentHash = explicitContentHash || await getReadAllContentHash(button);
    const targetContentHash = await getEventTargetReadAllContentHash(event);
    const targetConfirmed = Boolean(targetContentHash && contentHash && readAllHashesMatch(targetContentHash, contentHash));
    if (targetContentHash && contentHash && !targetConfirmed) return;
    if (event && !targetConfirmed) {
      const inside = await eventPointInsideReadAllButton(event, button);
      if (inside !== true) return;
    }
    if (!contentHash || !shouldAcceptReadAllActivation(contentHash)) return;
    await handleReadAllClick(button, contentHash);
  }

async function handleButtonClick(button, payloadId, options = {}) {
    const stateOptions = button
      ? { button, sync: options.syncState !== false }
      : { sync: false };
    const payload = payloads.get(payloadId) || (button ? await payloadFromButton(button, payloadId) : null);
    if (!payload) {
      addRuntimeLog("채팅 스피커 클릭 실패", { payloadId, reason: "payload을 찾지 못했습니다." });
      if (button) await setButtonState(button, "error", "ja");
      return;
    }

    activePlaybackOwnerBotId = lastKnownCharacterId || activePlaybackOwnerBotId || "";

    if (activeReadAllContentHash) {
      activeReadAllSequenceId += 1;
      latestChatPlaybackRequestId += 1;
      const readAllContentHash = activeReadAllContentHash;
      activeReadAllContentHash = "";
      activeReadAllOwnerBotId = "";
      activeReadAllStopAllowedAt = 0;
      await setReadAllButtonsState(readAllContentHash, "idle").catch(() => {});
    }

    // 오버레이 선택재생 루프 실행 중 → 수동 재생 우선 (마지막 입력만 재생, 겹침 방지)
    // 참고: 오버레이 버튼/리스트/호버 점프는 jumpToSegment를 경유하므로 여기에 안 옴.
    // 이 분기는 채팅 TTS 버튼·전체읽기 등 루프 바깥 수동 진입을 처리.
    if (overlayCycleRunning) {
      overlayCycleCancelled = true;
      overlayCycleRunning = false;
      stopCurrentAudio();
      if (overlayPlayFromBtn) {
        try { await overlayPlayFromBtn.setInnerHTML("<span>&#9654;</span><span>선택 재생</span>").catch(() => {}); } catch (e) {}
      }
    }

    if (isCurrentAudioPlaying()) {
      const playingPayloadId = currentAudioPayloadId;
      if (playingPayloadId === payloadId) {
        addRuntimeLog("채팅 TTS 재생 중지", {
          payloadId,
          text: payload.sourceText,
        });
        stopCurrentAudio();
        await setActiveChatButtonState(payloadId, "idle", payload.mode, stateOptions);
        return;
      }
      addRuntimeLog("채팅 TTS 재생 전환", {
        fromPayloadId: playingPayloadId || "",
        toPayloadId: payloadId,
        text: payload.sourceText,
      });
      stopCurrentAudio();
    }

    addRuntimeLog("채팅 스피커 클릭", {
      payloadId,
      mode: payload.mode,
      speakerName: payload.speakerName,
      segmentKind: payload.segmentKind,
      text: payload.sourceText,
    });

    // 단일 비행 (single-flight): 이미 TTS 작업이 진행 중이면 즉시 큐잉. 최신 클릭이 이전 대기 클릭을 덮어씀.
    // 예외: 캐시에 이미 있으면 서버 요청이 필요 없으므로 대기 없이 즉시 재생.
    const wasInFlight = ttsGenerationInFlight;
    if (ttsGenerationInFlight) {
      const isCached = await checkSegmentCached(payload).catch(() => false);
      if (!isCached) {
        const prev = pendingManualTtsClick;
        pendingManualTtsClick = { button, payloadId, options, ts: Date.now(), mode: payload.mode };
        addRuntimeLog("TTS 클릭 대기열 등록 (진행 중)", {
          payloadId,
          prevPayloadId: prev?.payloadId || "",
          replaced: Boolean(prev),
        });
        await setActiveChatButtonState(payloadId, "busy", payload.mode, stateOptions).catch(() => {});
        return;
      }
      addOverlayLog("캐시 적중 — 대기 없이 즉시 재생 (진행 중 TTS 무관)");
    }
    if (!wasInFlight) ttsGenerationInFlight = true;

    const playbackRequestId = ++latestChatPlaybackRequestId;
    chatTtsPrepareInFlight = true;
    const myPrepareToken = ++chatTtsPrepareToken;
    chatTtsPrepareLockedUntil = Date.now() + CHAT_TTS_PREPARE_LOCK_MS;
    await setActiveChatButtonState(payloadId, "busy", payload.mode, stateOptions);
    try {
      let textForTts = payload.sourceText;
      if (payload.mode === "ko" || payload.mode === "en") {
        textForTts = await translateToJapanese(payload.sourceText, payload.mode);
        addOverlayLog("번역완료: " + (textForTts || "").slice(0, 30) + " (reqId=" + playbackRequestId + ", latest=" + latestChatPlaybackRequestId + ")");
      }
      let playbackStarted = false;
      const playbackState = await synthesizeAndPlay(textForTts, payload, {
        onAudioState: (state) => {
          addOverlayLog("onAudioState: " + state);
          if (state === "playing") {
            playbackStarted = true;
            if (myPrepareToken === chatTtsPrepareToken) chatTtsPrepareInFlight = false;
            if (currentAudio) {
              try { currentAudio.playbackRate = overlayConfig.speed; } catch (e) {}
              try { currentAudio.volume = overlayConfig.volume / 100; } catch (e) {}
            }
            setActiveChatButtonState(payloadId, "busy", payload.mode, stateOptions).catch(() => {});
            if (typeof updatePlayingHighlight === "function") updatePlayingHighlight(payloadId).catch(() => {});
          } else {
            setActiveChatButtonState(payloadId, "idle", payload.mode, stateOptions).catch(() => {});
            if (typeof updatePlayingHighlight === "function") updatePlayingHighlight("").catch(() => {});
          }
        },
        shouldPlay: () => {
          const ok = playbackRequestId === latestChatPlaybackRequestId;
          if (!ok) addOverlayLog("shouldPlay=false (reqId=" + playbackRequestId + ", latest=" + latestChatPlaybackRequestId + ")");
          return ok;
        },
      });
      addOverlayLog("playbackState=" + playbackState + " started=" + playbackStarted + " currentAudio=" + (currentAudio ? "있음" : "null") + " playing=" + isCurrentAudioPlaying());
      if (playbackState === "stopped") {
        await setActiveChatButtonState(payloadId, "idle", payload.mode, stateOptions);
      } else if (playbackState === "superseded") {
        await setActiveChatButtonState(payloadId, "idle", payload.mode, stateOptions);
      } else if (!playbackStarted) {
        activeChatButtonStates.delete(payloadId);
        if (button) {
          await setButtonState(button, "done", payload.mode);
          setTimeout(() => setButtonState(button, "idle", payload.mode), 1200);
        }
      }
    } catch (error) {
      console.log(`[RisuTTS] Playback failed: ${describeError(error)}`);
      addRuntimeLog("채팅 TTS 재생 실패", {
        payloadId,
        error: describeError(error),
        text: payload.sourceText,
      });
      activeChatButtonStates.delete(payloadId);
      if (button) await setButtonState(button, "error", payload.mode);
    } finally {
      if (myPrepareToken === chatTtsPrepareToken) {
        chatTtsPrepareInFlight = false;
      }
      if (!wasInFlight) {
        ttsGenerationInFlight = false;
        firePendingManualClick();
      }
    }
  }

  function rememberedPayloadFromButtonHint(payloadId, contentHash = "", segmentIndex = "") {
    const normalizedPayloadId = payloadIdFromHtml(payloadId) || String(payloadId || "").trim();
    const normalizedHash = String(contentHash || "").trim();
    const normalizedIndex = Number(segmentIndex);
    const hasIndex = Number.isFinite(normalizedIndex);
    if (!normalizedHash && !normalizedPayloadId) return null;

    const matchesPayload = (payload) => Boolean(
      payload
      && normalizedPayloadId
      && String(payload.id || "") === normalizedPayloadId
    );
    const matchesPosition = (payload) => Boolean(
      payload
      && normalizedHash
      && String(payload.contentHash || normalizedHash) === normalizedHash
      && hasIndex
      && Number(payload.segmentIndex ?? payload.index ?? -1) === normalizedIndex
    );
    const normalizeRemembered = (payload) => {
      if (!payload?.sourceText || !payload?.mode) return null;
      const record = {
        id: normalizedPayloadId || payload.id || "",
        mode: payload.mode,
        sourceText: payload.sourceText,
        contentHash: payload.contentHash || normalizedHash || hashText(payload.sourceText),
        segmentIndex: Number.isFinite(Number(payload.segmentIndex)) ? Number(payload.segmentIndex) : (hasIndex ? normalizedIndex : 0),
        speakerName: payload.speakerName || "",
        speakerCueGender: payload.speakerCueGender || "",
        segmentKind: payload.segmentKind || "line",
        createdAt: Date.now(),
      };
      if (!record.id) {
        record.id = createPayload(record.sourceText, record.mode, record.contentHash, record.segmentIndex, {
          speakerName: record.speakerName,
          speakerCueGender: record.speakerCueGender,
          segmentKind: record.segmentKind,
        });
        return payloads.get(record.id) || record;
      }
      payloads.set(record.id, record);
      return record;
    };

    const rememberedList = normalizedHash ? (readAllPayloadsByHash.get(normalizedHash) || []) : [];
    const rememberedPayload = rememberedList.find(matchesPayload) || rememberedList.find(matchesPosition);
    const fromPayload = normalizeRemembered(rememberedPayload);
    if (fromPayload) return fromPayload;

    const rememberedSegments = normalizedHash ? (contentSegmentsByHash.get(normalizedHash) || []) : [];
    const segment = rememberedSegments.find((item) => (
      item
      && normalizedPayloadId
      && String(item.payloadId || "") === normalizedPayloadId
    )) || rememberedSegments.find((item) => (
      item
      && hasIndex
      && Number(item.index ?? -1) === normalizedIndex
    ));
    if (!segment?.text || !segment?.mode) return null;
    const payload = {
      id: normalizedPayloadId || segment.payloadId || "",
      mode: segment.mode,
      sourceText: segment.text,
      contentHash: normalizedHash || hashText(segment.text),
      segmentIndex: Number(segment.index || 0),
      speakerName: segment.speakerName || "",
      speakerCueGender: segment.speakerCueGender || "",
      segmentKind: segment.segmentKind || "line",
      createdAt: Date.now(),
    };
    if (!payload.id) {
      payload.id = createPayload(payload.sourceText, payload.mode, payload.contentHash, payload.segmentIndex, {
        speakerName: payload.speakerName,
        speakerCueGender: payload.speakerCueGender,
        segmentKind: payload.segmentKind,
      });
      return payloads.get(payload.id) || payload;
    }
    payloads.set(payload.id, payload);
    return payload;
  }

  async function payloadFromButton(button, payloadId) {
    const [mode, sourceText, contentHash, segmentIndex, speakerName, speakerCueGender, segmentKind] = await Promise.all([
      getElementAttribute(button, "x-risutts-mode", "data-risutts-mode"),
      getElementAttribute(button, "x-risutts-text", "data-risutts-text"),
      getElementAttribute(button, "x-risutts-content", "data-risutts-content"),
      getElementAttribute(button, "x-risutts-segment", "data-risutts-segment"),
      getElementAttribute(button, "x-risutts-speaker", "data-risutts-speaker"),
      getElementAttribute(button, "x-risutts-speaker-gender", "data-risutts-speaker-gender"),
      getElementAttribute(button, "x-risutts-kind", "data-risutts-kind"),
    ]);
    const rememberedPayload = rememberedPayloadFromButtonHint(payloadId, contentHash, segmentIndex);
    if (!sourceText && rememberedPayload) return rememberedPayload;
    const normalizedMode = mode === "ko" || mode === "en" || mode === "ja" ? mode : getSegmentMode(sourceText || "");
    if (!sourceText || !normalizedMode) return null;
    const payload = {
      id: payloadId,
      mode: normalizedMode,
      sourceText,
      contentHash: contentHash || hashText(sourceText),
      segmentIndex: Number.isFinite(Number(segmentIndex)) ? Number(segmentIndex) : 0,
      speakerName: speakerName || "",
      speakerCueGender: speakerCueGender || "",
      segmentKind: segmentKind || "line",
      createdAt: Date.now(),
    };
    payloads.set(payloadId, payload);
    return payload;
  }

  async function translateToJapanese(sourceText, sourceMode = "ko", options = {}) {
    const metrics = options?.metrics && typeof options.metrics === "object" ? options.metrics : null;
    const normalizedSourceMode = sourceMode === "en" ? "en" : "ko";
    const useGoogle = (config.translationMethod === "google");
    const promptHash = useGoogle ? "google" : hashText(config.translationPrompt || DEFAULT_TRANSLATION_PROMPT);
    const cacheKey = `${normalizedSourceMode}-ja:${hashText(sourceText)}:${useGoogle ? "google" : config.translationModel}:${useGoogle ? "google" : config.translationEndpoint}:${promptHash}`;
    if (translationCache[cacheKey]) {
      if (metrics) metrics.translationCacheHit = true;
      addRuntimeLog("번역 캐시 사용", {
        sourceMode: normalizedSourceMode,
        sourceText,
        translatedText: translationCache[cacheKey],
      });
      return translationCache[cacheKey];
    }

    let translated = "";
    if (metrics) metrics.translationCacheHit = false;
    if (useGoogle) {
      addRuntimeLog("구글 번역 요청", { sourceMode: normalizedSourceMode, sourceText });
      translated = await translateViaGoogle(sourceText, normalizedSourceMode);
    } else if (config.translationEndpoint) {
      addRuntimeLog("번역 모델 엔드포인트 요청", {
        endpoint: config.translationEndpoint,
        model: config.translationModel,
        promptHash,
        sourceMode: normalizedSourceMode,
        sourceText,
      });
      translated = await translateViaEndpoint(sourceText, normalizedSourceMode);
    } else {
      addRuntimeLog("RisuAI 번역 모델 요청", {
        model: config.translationModel || "RisuAI translate",
        promptHash,
        sourceMode: normalizedSourceMode,
        sourceText,
      });
      translated = await translateViaRisu(sourceText, normalizedSourceMode);
    }

    translated = cleanTranslation(translated);
    if (!translated) {
      throw new Error("Translation returned an empty result.");
    }

    translationCache[cacheKey] = translated;
    await saveTranslationCache();
    addRuntimeLog("번역 결과 저장", {
      sourceMode: normalizedSourceMode,
      sourceText,
      translatedText: translated,
    });
    return translated;
  }

  async function translateViaGoogle(sourceText, sourceMode = "ko") {
    const sl = sourceMode === "en" ? "en" : "ko";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=ja&dt=t&q=${encodeURIComponent(sourceText)}`;
    const attempts = [
      { label: "nativeFetch", run: async () => api.nativeFetch(url, { method: "GET", headers: {} }) },
      { label: "nativeFetch(no interceptor)", run: async () => api.nativeFetch(url, { method: "GET", headers: {}, interceptor: false }) },
      { label: "browser fetch", run: async () => fetch(url, { method: "GET" }) },
    ];
    for (const attempt of attempts) {
      try {
        const response = await attempt.run();
        if (!response.ok) continue;
        const data = await response.json();
        if (!Array.isArray(data) || !Array.isArray(data[0])) continue;
        const parts = data[0].map((segment) => (segment && segment[0]) ? segment[0] : "").filter(Boolean);
        const translated = parts.join("");
        if (translated) return translated;
      } catch (e) {
        addRuntimeLog("구글 번역 시도 실패 (" + attempt.label + "): " + describeError(e));
      }
    }
    throw new Error("구글 번역 요청 실패 — 네트워크 또는 CORS 문제일 수 있습니다.");
  }

  async function translateViaRisu(sourceText, sourceMode = "ko") {
    if (typeof api.runLLMModel !== "function") {
      throw new Error("RisuAI runLLMModel API is not available.");
    }
    const sourceLanguage = sourceMode === "en" ? "English" : "Korean";
    const systemPrompt = translationSystemPrompt(sourceLanguage);

    const response = await api.runLLMModel({
      mode: "translate",
      staticModel: config.translationModel || undefined,
      allowPlugins: true,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: sourceText,
        },
      ],
    });

    return await responseToText(response);
  }

  async function translateViaEndpoint(sourceText, sourceMode = "ko") {
    const headers = { "Content-Type": "application/json" };
    if (config.translationApiKey) {
      headers.Authorization = `Bearer ${config.translationApiKey}`;
    }
    const sourceLanguage = sourceMode === "en" ? "English" : "Korean";
    const systemPrompt = translationSystemPrompt(sourceLanguage);
    const response = await api.nativeFetch(config.translationEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.translationModel || undefined,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          { role: "user", content: sourceText },
        ],
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      const retryAfterHeader = response.headers?.get?.("retry-after") || "";
      const error = new Error(`번역 모델 엔드포인트가 HTTP ${response.status}를 반환했습니다${message ? `: ${message.slice(0, 300)}` : "."}`);
      error.status = response.status;
      error.retryAfterMs = boundedRetryDelayMs(Number(retryAfterHeader) * 1000) || retryDelayMsFromText(message);
      throw error;
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content
      || data?.choices?.[0]?.text
      || data?.translation
      || data?.result
      || data?.content
      || "";
  }

  async function requestCaptionModel(messages, options = {}) {
    if (config.captionEndpoint) {
      return await requestCaptionModelViaEndpoint(messages, options);
    }
    return await requestCaptionModelViaRisu(messages, options);
  }

  async function requestCaptionModelViaRisu(messages, options = {}) {
    if (typeof api.runLLMModel !== "function") {
      throw new Error("RisuAI runLLMModel API is not available.");
    }
    const mode = config.captionModelSource === "main" ? "main" : "otherAx";
    const response = await api.runLLMModel({
      mode,
      staticModel: config.captionModel || undefined,
      allowPlugins: options.allowPlugins !== false,
      messages,
    });
    return await responseToText(response);
  }

  async function requestCaptionModelViaEndpoint(messages, options = {}) {
    const headers = { "Content-Type": "application/json" };
    if (config.captionApiKey) {
      headers.Authorization = `Bearer ${config.captionApiKey}`;
    }
    const response = await api.nativeFetch(config.captionEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.captionModel || undefined,
        temperature: options.temperature ?? 0.25,
        messages,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`캡션 모델 엔드포인트가 HTTP ${response.status}를 반환했습니다: ${text.slice(0, 240)}`);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content
      || data?.choices?.[0]?.text
      || data?.caption
      || data?.result
      || data?.content
      || data;
    return typeof content === "string" ? content : JSON.stringify(content || "");
  }

  async function responseToText(response) {
    if (typeof response === "string") return response;
    if (response && typeof response.getReader === "function") {
      const reader = response.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      return text + decoder.decode();
    }
    const extracted = extractTextFromUnknown(response);
    if (extracted) return extracted;
    if (response && typeof response === "object") {
      return JSON.stringify(response);
    }
    return String(response || "");
  }

  function extractTextFromUnknown(value, seen = new Set()) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value !== "object") return "";
    if (seen.has(value)) return "";
    seen.add(value);

    const preferredPaths = [
      ["content"],
      ["message"],
      ["text"],
      ["response"],
      ["result"],
      ["output"],
      ["data"],
      ["value"],
      ["choices", 0, "message", "content"],
      ["choices", 0, "text"],
      ["choices", 0, "delta", "content"],
      ["candidates", 0, "content"],
      ["generations", 0, "text"],
      ["output", 0, "content", 0, "text"],
      ["output", 0, "content"],
    ];

    for (const path of preferredPaths) {
      const found = getPath(value, path);
      const text = extractTextFromUnknown(found, seen);
      if (looksLikeModelText(text)) return text;
    }

    if (Array.isArray(value)) {
      const parts = value
        .map((item) => extractTextFromUnknown(item, seen))
        .filter(looksLikeModelText);
      return parts.join("\n").trim();
    }

    for (const [key, child] of Object.entries(value)) {
      if (!/(content|message|text|response|result|output|data|value|caption|answer|delta)/i.test(key)) continue;
      const text = extractTextFromUnknown(child, seen);
      if (looksLikeModelText(text)) return text;
    }

    return "";
  }

  function getPath(value, path) {
    let current = value;
    for (const key of path) {
      if (current == null) return undefined;
      current = current[key];
    }
    return current;
  }

  function looksLikeModelText(value) {
    const text = String(value || "").trim();
    if (!text) return false;
    if (text === "[object Object]") return false;
    if (/^\{[\s\S]*\}$/.test(text) && text.length > 80) {
      return /"(?:characters|caption|voiceCaption|voice_design_caption|sampleText|sample_text)"\s*:/.test(text);
    }
    return true;
  }

  function cleanTranslation(value) {
    return String(value || "")
      .replace(/^```(?:\w+)?/i, "")
      .replace(/```$/i, "")
      .replace(/^\s*["'`]+|["'`]+\s*$/g, "")
      .trim();
  }

  function translationSystemPrompt(sourceLanguage) {
    const prompt = String(config.translationPrompt || DEFAULT_TRANSLATION_PROMPT).trim() || DEFAULT_TRANSLATION_PROMPT;
    return prompt
      .replace(/\{sourceLanguage\}/g, sourceLanguage)
      .replace(/\{targetLanguage\}/g, "Japanese");
  }

  function collectEmotionDirectorContext(payload = {}, spokenText = "") {
    const beforeCount = Math.round(clampNumber(config.emotionDirectorContextBefore, 0, 10, DEFAULT_CONFIG.emotionDirectorContextBefore));
    const afterCount = Math.round(clampNumber(config.emotionDirectorContextAfter, 0, 10, DEFAULT_CONFIG.emotionDirectorContextAfter));
    const currentIndex = Number(payload.segmentIndex || 0);
    const segments = contentSegmentsByHash.get(payload.contentHash) || [];
    const normalized = segments.length ? segments : [{
      index: currentIndex,
      mode: payload.mode || "",
      text: payload.sourceText || spokenText,
      speakerName: payload.speakerName || "",
      segmentKind: payload.segmentKind || "line",
    }];
    const sorted = normalized
      .filter((segment) => segment && segment.text)
      .sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
    const currentPosition = Math.max(0, sorted.findIndex((segment) => Number(segment.index || 0) === currentIndex));
    const position = currentPosition >= 0 ? currentPosition : 0;
    const before = sorted.slice(Math.max(0, position - beforeCount), position);
    const after = sorted.slice(position + 1, position + 1 + afterCount);
    const current = sorted[position] || normalized[0] || {};
    return {
      before,
      current: {
        index: currentIndex,
        mode: payload.mode || current.mode || "",
        text: payload.sourceText || current.text || spokenText,
        ttsText: spokenText,
        speakerName: payload.speakerName || current.speakerName || "",
        segmentKind: payload.segmentKind || current.segmentKind || "line",
      },
      after,
      beforeCount,
      afterCount,
    };
  }

  function trimEmotionContextSegment(segment) {
    return {
      speakerName: segment?.speakerName || "",
      segmentKind: segment?.segmentKind || "line",
      text: String(segment?.text || "").slice(0, 500),
    };
  }

  function emotionDirectorUsesEmoji() {
    return config.emotionDirectorApplyMode === EMOTION_DIRECTOR_MODE_CAPTION_EMOJI
      || config.emotionDirectorApplyMode === EMOTION_DIRECTOR_MODE_CAPTION_EMOJI_TEXT;
  }

  function emotionDirectorAllowsTextEdit() {
    return config.emotionDirectorApplyMode === EMOTION_DIRECTOR_MODE_CAPTION_EMOJI_TEXT;
  }

  function isGlobalGenderFallbackVoiceContext(voiceContext = {}) {
    const characterId = String(voiceContext.characterId || "");
    const voiceSource = String(voiceContext.voiceSource || "");
    return characterId === GLOBAL_MALE_ID
      || characterId === GLOBAL_FEMALE_ID
      || /^global-(?:male|female)\b/i.test(voiceSource);
  }

  function emotionVoiceRoleForContext(voiceContext = {}) {
    if (isGlobalGenderFallbackVoiceContext(voiceContext)) {
      return "global-gender-fallback-character-voice";
    }
    if (String(voiceContext.characterId || "") === GLOBAL_NARRATION_ID
      || /^global-narration\b/i.test(String(voiceContext.voiceSource || ""))) {
      return "global-narration-voice";
    }
    return "character-voice";
  }

  function emotionDirectorMessages(spokenText, payload = {}, voiceContext = {}) {
    const context = collectEmotionDirectorContext(payload, spokenText);
    const allowTextEdit = emotionDirectorAllowsTextEdit();
    const useEmoji = emotionDirectorUsesEmoji();
    const voiceRole = emotionVoiceRoleForContext(voiceContext);
    return {
      context,
      messages: [
        {
          role: "system",
          content: [
            config.emotionDirectorPrompt || DEFAULT_EMOTION_DIRECTOR_PROMPT,
            allowTextEdit
              ? "You may optionally provide spokenText only when a tiny punctuation, pause, or allowed emoji placement change clearly improves TTS acting. Do not change meaning."
              : "Do not translate or rewrite the spoken line. Keep spokenText empty.",
            "Return only JSON in this exact shape: {\"emotion\":\"...\",\"intensity\":0.0,\"captionJa\":\"...\",\"emotionEmoji\":\"\",\"spokenText\":\"\",\"reason\":\"...\"}.",
            "The following output-mode rules override any conflicting instruction above.",
            useEmoji
              ? (allowTextEdit ? EMOTION_DIRECTOR_INLINE_EMOJI_PROMPT : EMOTION_DIRECTOR_LEADING_EMOJI_PROMPT)
              : "The user selected caption-only emotion application mode. emotionEmoji must be an empty string.",
            voiceRole === "global-gender-fallback-character-voice"
              ? "Important: this matched global male/female fallback voice is a character voice for speech, thoughts, monologue, or dialogue. Treat it like an ordinary character voice. Do not use 📖 for this voice unless the current line itself is true descriptive narration."
              : "Use 📖 only for true descriptive narration, not for character speech, thoughts, or dialogue.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            speakerName: payload.speakerName || voiceContext.speakerName || "",
            matchedCharacterName: voiceContext.characterName || "",
            segmentKind: payload.segmentKind || "line",
            voiceRole,
            spokenText,
            originalText: payload.sourceText || spokenText,
            contextBefore: context.before.map(trimEmotionContextSegment),
            current: trimEmotionContextSegment(context.current),
            contextAfter: context.after.map(trimEmotionContextSegment),
          }),
        },
      ],
    };
  }

  function cloneEmotionDirection(direction) {
    return direction ? { ...direction } : null;
  }

  function emotionDirectionCacheKey(messages, payload = {}, voiceContext = {}) {
    return [
      "emotion-v1",
      config.emotionDirectorApplyMode,
      config.emotionDirectorModel || "",
      config.emotionDirectorEndpoint || "",
      hashText(config.emotionDirectorPrompt || DEFAULT_EMOTION_DIRECTOR_PROMPT),
      payload.contentHash || "",
      payload.segmentIndex ?? "",
      voiceContext.characterId || "",
      voiceContext.voiceSource || "",
      voiceContext.voice || "",
      hashText(JSON.stringify(messages || [])),
    ].join(":");
  }

  function getCachedEmotionDirection(cacheKey) {
    if (!cacheKey || !emotionDirectionCache.has(cacheKey)) return null;
    const cached = emotionDirectionCache.get(cacheKey);
    emotionDirectionCache.delete(cacheKey);
    emotionDirectionCache.set(cacheKey, cached);
    return cloneEmotionDirection(cached);
  }

  function rememberEmotionDirection(cacheKey, direction) {
    if (!cacheKey || !direction) return;
    emotionDirectionCache.delete(cacheKey);
    emotionDirectionCache.set(cacheKey, cloneEmotionDirection(direction));
    while (emotionDirectionCache.size > EMOTION_DIRECTION_CACHE_MAX) {
      const oldestKey = emotionDirectionCache.keys().next().value;
      if (!oldestKey) break;
      emotionDirectionCache.delete(oldestKey);
    }
  }

  async function maybeCreateEmotionDirection(spokenText, payload = {}, voiceContext = {}, options = {}) {
    const metrics = options?.metrics && typeof options.metrics === "object" ? options.metrics : null;
    const manualCaption = cleanEmotionCaption(config.emotionDirectorManualCaption || "");
    if (manualCaption) {
      if (metrics) {
        metrics.emotionMode = "manual";
        metrics.emotionCacheEnabled = false;
        metrics.emotionCacheHit = false;
      }
      addRuntimeLog("디버깅 수동 캡션 사용", {
        captionJa: manualCaption,
        emotionDirectorEnabled: Boolean(config.emotionDirectorEnabled),
        speakerName: payload.speakerName || voiceContext.speakerName || "",
        text: spokenText,
      });
      return {
        emotion: "manual",
        intensity: 0,
        captionJa: manualCaption,
        emotionEmoji: "",
        spokenText: "",
        reason: "manual caption override",
        raw: "",
      };
    }
    if (!config.emotionDirectorEnabled) {
      if (metrics) {
        metrics.emotionMode = "off";
        metrics.emotionCacheEnabled = false;
        metrics.emotionCacheHit = false;
      }
      return null;
    }
    const { context, messages } = emotionDirectorMessages(spokenText, payload, voiceContext);
    const cacheEnabled = config.emotionDirectorCacheEnabled !== false;
    if (metrics) {
      metrics.emotionMode = "director";
      metrics.emotionCacheEnabled = cacheEnabled;
    }
    const cacheKey = cacheEnabled ? emotionDirectionCacheKey(messages, payload, voiceContext) : "";
    const cached = cacheEnabled ? getCachedEmotionDirection(cacheKey) : null;
    if (cached) {
      if (metrics) {
        metrics.emotionCacheHit = true;
        metrics.emotionCacheSize = emotionDirectionCache.size;
      }
      addRuntimeLog("감정 디렉터 캐시 사용", {
        emotion: cached.emotion,
        captionJa: cached.captionJa,
        emotionEmoji: cached.emotionEmoji,
        speakerName: payload.speakerName || voiceContext.speakerName || "",
        text: spokenText,
        cacheSize: emotionDirectionCache.size,
      });
      return cached;
    }
    if (metrics) metrics.emotionCacheHit = false;
    try {
      addRuntimeLog("감정 디렉터 요청", {
        endpoint: config.emotionDirectorEndpoint || "RisuAI runLLMModel",
        model: config.emotionDirectorModel || "",
        promptHash: hashText(config.emotionDirectorPrompt || DEFAULT_EMOTION_DIRECTOR_PROMPT),
        speakerName: payload.speakerName || voiceContext.speakerName || "",
        before: context.before.length,
        after: context.after.length,
        text: spokenText,
      });
      const raw = config.emotionDirectorEndpoint
        ? await requestEmotionDirectionViaEndpoint(messages)
        : await requestEmotionDirectionViaRisu(messages);
      const direction = parseEmotionDirectorDraft(raw);
      if (!direction.captionJa && !direction.emotionEmoji) {
        addRuntimeLog("감정 디렉터 결과 없음", {
          raw: String(raw || "").slice(0, 500),
        });
        return null;
      }
      addRuntimeLog("감정 디렉터 결과", {
        emotion: direction.emotion,
        intensity: direction.intensity,
        captionJa: direction.captionJa,
        emotionEmoji: direction.emotionEmoji,
        spokenText: direction.spokenText || "",
        reason: direction.reason,
      });
      if (cacheEnabled) {
        rememberEmotionDirection(cacheKey, direction);
      }
      return direction;
    } catch (error) {
      addRuntimeLog("감정 디렉터 실패", {
        error: describeError(error),
        "후속 처리": config.emotionDirectorContinueOnError ? "기존 TTS 흐름으로 계속 진행합니다." : "감정 디렉터 실패를 TTS 오류로 처리합니다.",
      });
      if (!config.emotionDirectorContinueOnError) {
        throw error;
      }
      return null;
    }
  }

  async function requestEmotionDirectionViaRisu(messages) {
    if (typeof api.runLLMModel !== "function") {
      throw new Error("RisuAI runLLMModel API is not available.");
    }
    const response = await api.runLLMModel({
      mode: "otherAx",
      staticModel: config.emotionDirectorModel || undefined,
      allowPlugins: false,
      messages,
    });
    return await responseToText(response);
  }

  async function requestEmotionDirectionViaEndpoint(messages) {
    const headers = { "Content-Type": "application/json" };
    if (config.emotionDirectorApiKey) {
      headers.Authorization = `Bearer ${config.emotionDirectorApiKey}`;
    }
    const response = await api.nativeFetch(config.emotionDirectorEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.emotionDirectorModel || undefined,
        temperature: 0.25,
        messages,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`감정 디렉터 엔드포인트가 HTTP ${response.status}를 반환했습니다: ${text.slice(0, 240)}`);
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content
      || data?.choices?.[0]?.text
      || data?.captionJa
      || data?.caption
      || data?.result
      || data;
  }

  function parseEmotionDirectorDraft(value) {
    const text = typeof value === "string" ? value : JSON.stringify(value || {});
    const jsonText = extractJsonObjectText(text);
    let parsed = null;
    if (jsonText) {
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        parsed = null;
      }
    }
    const source = parsed && typeof parsed === "object" ? parsed : {};
    const captionJa = cleanEmotionCaption(
      source.captionJa
      || source.caption
      || source.voiceCaption
      || source.voice_design_caption
      || source.delivery
      || extractJsonishField(text, "captionJa")
      || extractJsonishField(text, "caption")
      || ""
    );
    return {
      emotion: String(source.emotion || extractJsonishField(text, "emotion") || "").trim().slice(0, 80),
      intensity: clampNumber(source.intensity, 0, 1, 0),
      captionJa,
      emotionEmoji: cleanEmotionEmoji(source.emotionEmoji || source.emoji || extractJsonishField(text, "emotionEmoji") || ""),
      spokenText: emotionDirectorAllowsTextEdit()
        ? cleanEmotionSpokenText(source.spokenText || source.text || extractJsonishField(text, "spokenText") || "")
        : "",
      reason: String(source.reason || extractJsonishField(text, "reason") || "").trim().slice(0, 240),
      raw: text,
    };
  }

  function extractJsonObjectText(value) {
    const text = String(value || "")
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    if (text.startsWith("{") && text.endsWith("}")) return text;
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : "";
  }

  function cleanEmotionCaption(value) {
    return cleanCaption(value)
      .replace(/^\s*(?:captionJa|caption|voice\s*caption|演技|感情)\s*[:：]\s*/i, "")
      .slice(0, 260)
      .trim();
  }

  function cleanEmotionEmoji(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    for (const emoji of IRODORI_EMOJI_TOKENS) {
      if (text.includes(emoji)) return emoji;
    }
    const normalized = text.replace(/\uFE0F/g, "");
    for (const emoji of IRODORI_EMOJI_TOKENS) {
      if (normalized.includes(emoji.replace(/\uFE0F/g, ""))) return emoji;
    }
    return "";
  }

  function insertEmotionEmoji(text, emoji) {
    const base = String(text || "").trim();
    if (!base || !emoji || base.includes(emoji)) return base;
    const leadingQuote = base.match(/^([「『"“‘（(【\[])([\s\S]*)$/);
    if (leadingQuote) return `${leadingQuote[1]}${emoji}${leadingQuote[2]}`;
    return `${emoji}${base}`;
  }

  function applyEmotionDirectionToText(text, direction) {
    const edited = emotionDirectorAllowsTextEdit() ? String(direction?.spokenText || "").trim() : "";
    const base = edited || String(text || "").trim();
    const hasInlineEmoji = emotionDirectorAllowsTextEdit()
      && IRODORI_EMOJI_TOKENS.some((token) => base.includes(token));
    const emoji = emotionDirectorUsesEmoji() && !hasInlineEmoji
      ? cleanEmotionEmoji(direction?.emotionEmoji || "")
      : "";
    return insertEmotionEmoji(base, emoji);
  }

  function stableTtsCacheKey(text, payload = {}, voiceContext = {}) {
    return [
      "tts",
      "v2",
      voiceContext.characterId || "",
      payload.contentHash ? "msg" : "manual", // contentHash 자체가 아닌 존재 여부만 (메시지 간 캐시 공유)
      hashText(text),
      payload.mode || "ja",
      payload.segmentKind || "line",
      voiceContext.speakerName || payload.speakerName || "",
      voiceContext.voice || "none",
      voiceContext.voiceSource || "",
      config.ttsModel || "irodori-tts",
      config.responseFormat || "wav",
      config.numSteps,
      config.cfgScaleText,
      config.cfgScaleSpeaker,
      config.cfgScaleCaption,
      config.speed,
      config.chunkMinChars,
      config.emotionDirectorManualCaption ? "manual-caption" : (config.emotionDirectorEnabled ? "emotion-on" : "emotion-off"),
      config.emotionDirectorApplyMode,
      config.emotionDirectorManualCaption ? hashText(config.emotionDirectorManualCaption || "") : "",
      config.emotionDirectorEnabled ? hashText(config.emotionDirectorPrompt || DEFAULT_EMOTION_DIRECTOR_PROMPT) : "",
      config.emotionDirectorEnabled ? (config.emotionDirectorModel || "") : "",
      config.emotionDirectorEnabled ? (config.emotionDirectorEndpoint || "") : "",
      config.emotionDirectorEnabled ? config.emotionDirectorContextBefore : "",
      config.emotionDirectorEnabled ? config.emotionDirectorContextAfter : "",
      config.emotionDirectorEnabled ? (config.emotionDirectorCacheEnabled !== false ? "emotion-cache-on" : "emotion-cache-off") : "",
      normalizeDebugSeedInput(config.debugTtsSeed) || "",
    ].join(":");
  }

  function cleanEmotionSpokenText(value) {
    return String(value || "")
      .replace(/^```(?:\w+)?/i, "")
      .replace(/```$/i, "")
      .replace(/^\s*["'`]+|["'`]+\s*$/g, "")
      .trim()
      .slice(0, 500);
  }

  async function prepareTtsPlaybackEntry(text, payload, options = {}) {
    const report = typeof options.onStatus === "function"
      ? async (message) => { await Promise.resolve(options.onStatus(message)); }
      : async () => {};
    const shouldPlay = typeof options.shouldPlay === "function" ? options.shouldPlay : null;
    const metrics = options?.metrics && typeof options.metrics === "object" ? options.metrics : {};
const prepareStartedAt = monotonicNow();
    metrics.inputChars = String(text || "").length;

    await report("캐릭터 보이스 설정 확인 중...");
    const voiceResolveStartedAt = monotonicNow();
    const voiceContext = await resolveVoiceContext(payload);
    metrics.voiceResolveMs = elapsedMsSince(voiceResolveStartedAt);
    activePlaybackOwnerBotId = voiceContext.botId || lastKnownCharacterId || activePlaybackOwnerBotId || "";
    const reuseTtsCache = config.ttsCacheMode !== TTS_CACHE_MODE_REGENERATE;
    const audioKey = stableTtsCacheKey(text, payload, voiceContext);
    let entry = reuseTtsCache ? audioCache.get(audioKey) : null;
    let emotionDirection = null;
    let ttsText = text;
    metrics.ttsCacheHit = Boolean(entry);
    metrics.ttsCacheMode = config.ttsCacheMode;
    let acquiredMutex = false;

    if (!entry) {
      await acquireTtsMutex();
      acquiredMutex = true;
      ttsGenerationInFlight = true;
    }

    if (entry) {
      metrics.audioBytes = entry.bytes || 0;
      addRuntimeLog("TTS 캐시 사용", {
        voice: voiceContext.voice || "none",
        bytes: entry.bytes,
        textHash: hashText(text),
        cacheKeyHash: hashText(audioKey),
      });
      await report(`캐시된 오디오 사용 (${formatBytes(entry.bytes)}). 재생 준비 중...`);
    } else {
      const emotionStartedAt = monotonicNow();
      emotionDirection = await maybeCreateEmotionDirection(text, payload, voiceContext, { metrics });
      metrics.emotionMs = elapsedMsSince(emotionStartedAt);
      ttsText = applyEmotionDirectionToText(text, emotionDirection);
    }
    metrics.ttsChars = String(ttsText || "").length;
    metrics.emotionCaptionUsed = Boolean(emotionDirection?.captionJa);
    metrics.emotionEmojiUsed = Boolean(emotionDirection?.emotionEmoji);

    addRuntimeLog("TTS 보이스 매칭", {
      speakerName: voiceContext.speakerName || payload.speakerName || "",
      characterName: voiceContext.characterName,
      characterId: voiceContext.characterId,
      voiceSource: voiceContext.voiceSource,
      voice: voiceContext.voice || "none",
      text,
      ttsText,
      emotionApplyMode: config.emotionDirectorApplyMode,
      emotionCaption: emotionDirection?.captionJa || "",
      emotionEmoji: emotionDirectorUsesEmoji() ? (emotionDirection?.emotionEmoji || "") : "",
    });
    if (!entry) {
      await report([
        `사용 보이스: ${voiceContext.voice || "none"}`,
        voiceContext.speakerName ? `감지한 화자: ${voiceContext.speakerName}` : "",
        voiceContext.characterName ? `매칭 대상: ${voiceContext.characterName}` : "",
        "캐시 확인 중...",
      ].filter(Boolean).join("\n"));
    }
    if (!entry) {
      const generationAllowed = shouldPlay ? await Promise.resolve(shouldPlay()) : true;
if (!generationAllowed) {
        addRuntimeLog("TTS 생성 건너뜀", {
          reason: "더 나중에 누른 대사가 있어 TTS 생성을 요청하지 않습니다.",
          voice: voiceContext.voice || "none",
          textHash: hashText(ttsText),
        });
        await report("더 나중에 누른 대사가 있어 TTS 생성을 요청하지 않습니다.");
        metrics.state = "superseded";
        metrics.prepareTotalMs = elapsedMsSince(prepareStartedAt);
        if (acquiredMutex) {
          ttsGenerationInFlight = false;
          releaseTtsMutex();
          firePendingManualClick();
        }
        return { state: "superseded", metrics };
      }
      if (!reuseTtsCache) {
        addRuntimeLog("TTS 캐시 미사용", {
          reason: "설정에 따라 같은 대사도 매번 새로 생성합니다.",
          voice: voiceContext.voice || "none",
          textHash: hashText(ttsText),
        });
      }
      addRuntimeLog("TTS 캐시 미스", {
        voice: voiceContext.voice || "none",
        model: config.ttsModel || "irodori-tts",
        textHash: hashText(ttsText),
        emotionCaptionHash: hashText(emotionDirection?.captionJa || ""),
        cacheKeyHash: hashText(audioKey),
      });
      await report([
        "TTS 생성 요청 중...",
        `서버: ${normalizeServerUrl(config.serverUrl)}`,
        `모델: ${config.ttsModel || "irodori-tts"}`,
        `steps: ${config.numSteps}`,
      ].join("\n"));
      const ttsServerStartedAt = monotonicNow();
      try {
        entry = await requestSpeech(ttsText, voiceContext.voice, emotionDirection, voiceContext);
      } catch (speechErr) {
        if (acquiredMutex) {
          ttsGenerationInFlight = false;
          releaseTtsMutex();
          firePendingManualClick();
        }
        throw speechErr;
      }
      metrics.ttsServerMs = elapsedMsSince(ttsServerStartedAt);
      metrics.audioBytes = entry.bytes || 0;
      if (reuseTtsCache) setAudioCache(audioKey, entry);
      metrics.ttsCacheStored = Boolean(reuseTtsCache);
      await report(`오디오 수신 완료 (${formatBytes(entry.bytes)}). 재생 준비 중...`);
    }
    metrics.prepareTotalMs = elapsedMsSince(prepareStartedAt);
    metrics.voice = voiceContext.voice || "none";
    metrics.voiceSource = voiceContext.voiceSource || "";
    metrics.characterId = voiceContext.characterId || "";

    if (acquiredMutex) {
      ttsGenerationInFlight = false;
      releaseTtsMutex();
      firePendingManualClick();
    }

    return {
      state: "ready",
      entry,
      audioKey,
      voiceContext,
      reuseTtsCache,
      text,
      ttsText,
      emotionDirection,
      metrics,
    };
  }

  function disposePreparedTtsPlaybackEntry(prepared) {
    if (!prepared || prepared.state !== "ready") return;
    if (!prepared.reuseTtsCache) disposeAudioEntry(prepared.entry);
  }

  async function playPreparedTtsPlaybackEntry(prepared, payload, options = {}) {
    const report = typeof options.onStatus === "function"
      ? async (message) => { await Promise.resolve(options.onStatus(message)); }
      : async () => {};
    const onAudioState = typeof options.onAudioState === "function" ? options.onAudioState : null;
    const shouldPlay = typeof options.shouldPlay === "function" ? options.shouldPlay : null;
    if (!prepared || prepared.state !== "ready") return prepared?.state || "error";
    const { entry, audioKey, voiceContext, reuseTtsCache, ttsText } = prepared;
    const metrics = prepared.metrics && typeof prepared.metrics === "object" ? prepared.metrics : null;
    const playbackAllowed = shouldPlay ? await Promise.resolve(shouldPlay()) : true;
    if (!playbackAllowed) {
      addRuntimeLog("TTS 재생 건너뜀", {
        reason: "더 나중에 누른 스피커 요청이 있어 이 요청은 재생하지 않습니다.",
        voice: voiceContext.voice || "none",
        textHash: hashText(ttsText),
      });
      if (!reuseTtsCache) disposeAudioEntry(entry);
      await report("더 나중에 누른 대사가 있어 이 요청은 재생하지 않습니다.");
      return "superseded";
    }

    const playbackState = await playAudioEntry(entry, audioKey, onAudioState, {
      payloadId: payload.id || "",
      ownerBotId: voiceContext.botId || activePlaybackOwnerBotId || "",
      disposeAfterPlayback: !reuseTtsCache,
      waitForEnd: Boolean(options.waitForEnd),
      toggleIfSameAudioKey: false,
      metrics,
    });
    if (metrics) {
      metrics.playbackState = playbackState;
    }
    addRuntimeLog("TTS 재생 상태", {
      state: playbackState,
      voice: voiceContext.voice || "none",
      bytes: entry.bytes,
    });
    await report(options.waitForEnd && playbackState === "ended" ? "재생이 끝났습니다." : "재생 중입니다.");
    return playbackState;
  }

  async function synthesizeAndPlay(text, payload, options = {}) {
    const prepared = await prepareTtsPlaybackEntry(text, payload, options);
    return playPreparedTtsPlaybackEntry(prepared, payload, options);
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return "크기 알 수 없음";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function describeError(error) {
    if (!error) return "알 수 없는 오류";
    if (typeof error === "string") return error;
    const name = typeof error.name === "string" ? error.name.trim() : "";
    const message = typeof error.message === "string" ? error.message.trim() : "";
    if (name || message) {
      return [name, message].filter(Boolean).join(": ");
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}") return json;
    } catch {
      // Ignore stringify failures and use the generic object tag below.
    }
    const text = String(error || "").trim();
    if (text && text !== "[object Object]") return text;
    return Object.prototype.toString.call(error);
  }

  function isLikelyWebRisuLanAccessBlock(errorOrText = "", url = config.serverUrl) {
    const text = describeError(errorOrText).toLowerCase();
    if (!text) return false;
    const hasFetchBlock = text.includes("failed to fetch") || text.includes("networkerror");
    const hasProxyBlock = text.includes("error code: 1003") || text.includes("http 403");
    if (!hasFetchBlock && !hasProxyBlock) return false;
    try {
      const parsed = new URL(normalizeServerUrl(url));
      const host = parsed.hostname;
      const isPrivateHost =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.startsWith("192.168.") ||
        host.startsWith("10.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
      return parsed.protocol === "http:" && isPrivateHost;
    } catch {
      return false;
    }
  }

  function webRisuLanAccessBlockLines() {
    const serverUrl = normalizeServerUrl(config.serverUrl);
    return [
      "WebRisu의 HTTPS 페이지가 PC의 HTTP 주소를 직접 호출하지 못하는 경우로 보입니다.",
      `먼저 스마트폰 브라우저 주소창에서 ${serverUrl}/health 를 직접 열어보세요.`,
      "- 직접 열어서 JSON이 나오면 서버 자체는 응답 중입니다. 이 경우 WebRisu의 HTTPS -> HTTP 요청이 브라우저/프록시에서 막힌 것입니다.",
      "- 배포판 기본 실행은 PC 로컬 RisuAI 기준입니다. PC에서 사용할 때는 TTS 서버 URL을 http://127.0.0.1:8088 로 두고 start-risutts.cmd를 실행하세요.",
      "외부 기기 접속은 배포판 기본 지원 범위에 넣지 않습니다. WebRisu에서 계속 막히면 RisuAI와 RisuTTS 서버를 같은 PC에서 실행하는 구성을 권장합니다.",
    ];
  }

  function selectedVoiceForCharacterId(characterId) {
    return String(config.voiceByCharacter?.[characterId] || "").trim();
  }

  function globalNarrationFallback(source = "global-narration") {
    return {
      characterId: GLOBAL_NARRATION_ID,
      characterName: GLOBAL_NARRATION_NAME,
      voiceSource: source,
    };
  }

  function configuredGlobalFallback(fallback) {
    if (!fallback) return null;
    if ((fallback.characterId === GLOBAL_MALE_ID || fallback.characterId === GLOBAL_FEMALE_ID)
      && !selectedVoiceForCharacterId(fallback.characterId)) {
      return globalNarrationFallback(`${fallback.voiceSource}-via-global-narration`);
    }
    return fallback;
  }

  function globalFallbackForPayload(payload = {}) {
    if (!config.globalNarrationEnabled) return null;
    const segmentKind = payload.segmentKind || "line";
    const speakerCueGender = payload.speakerCueGender || "";
    if (speakerCueGender === "female") {
      return configuredGlobalFallback({
        characterId: GLOBAL_FEMALE_ID,
        characterName: GLOBAL_FEMALE_NAME,
        voiceSource: "global-female",
      });
    }
    if (speakerCueGender === "male") {
      return configuredGlobalFallback({
        characterId: GLOBAL_MALE_ID,
        characterName: GLOBAL_MALE_NAME,
        voiceSource: "global-male",
      });
    }
    if (speakerCueGender === "neutral") {
      return globalNarrationFallback();
    }
    if (payload.speakerName && segmentKind === "dialogue") {
      return globalNarrationFallback("global-narration-speaker-no-voice");
    }
    if (segmentKind === "narration" || segmentKind === "quote") {
      return globalNarrationFallback();
    }
    return null;
  }

  async function resolveVoiceContext(payload = {}) {
    const character = await getCharacterSnapshot();
    const characterId = getCharacterId(character);
    lastKnownCharacterId = characterId;
    const chatIndex = await getChatIndexSnapshot();
    const matched = payload.speakerName
      ? findVoiceCharacterBySpeakerCached(payload.speakerName, characterId)
      : null;
    const matchedCharacterId = matched?.key || matched?.referenceSet?.characterId || "";
    const matchedVoice = matchedCharacterId ? selectedVoiceForCharacterId(matchedCharacterId) : "";
    const globalFallback = (!matched || !matchedVoice) ? globalFallbackForPayload(payload) : null;
    const useMatchedVoice = Boolean(matched && (matchedVoice || !globalFallback));
    const targetCharacterId = useMatchedVoice
      ? matchedCharacterId
      : globalFallback?.characterId || characterId;
    const targetName = useMatchedVoice
      ? (matched?.referenceSet?.characterName || payload.speakerName || matchedCharacterId)
      : globalFallback?.characterName || character?.name || characterId;
    return {
      botId: characterId,
      characterId: targetCharacterId,
      chatIndex: String(chatIndex ?? "global"),
      speakerName: payload.speakerName || "",
      characterName: targetName,
      voiceSource: useMatchedVoice ? "speaker" : globalFallback?.voiceSource || "current-character",
      voice: selectedVoiceForCharacterId(targetCharacterId) || config.defaultVoice || "none",
      displayColor: characterColorForCharacterId(targetCharacterId, targetName),
    };
  }

  async function getCharacterSnapshot() {
    const now = Date.now();
    if (
      voiceContextSnapshot.character
      && voiceContextSnapshot.ts
      && now - voiceContextSnapshot.ts < VOICE_CONTEXT_SNAPSHOT_TTL_MS
      && voiceContextSnapshot.characterId === lastKnownCharacterId
    ) {
      return voiceContextSnapshot.character;
    }
    const character = await api.getCharacter().catch(() => null);
    const idNow = getCharacterId(character);
    const idChanged = voiceContextSnapshot.characterId && voiceContextSnapshot.characterId !== idNow;
    voiceContextSnapshot = { characterId: idNow, chatIndex: "", ts: now, character };
    lastKnownCharacterId = idNow;
    if (idChanged && typeof speakerMatchCacheByBot !== "undefined" && speakerMatchCacheByBot) {
      speakerMatchCacheByBot.clear();
    }
    return character;
  }

  async function getChatIndexSnapshot() {
    if (typeof api.getCurrentChatIndex !== "function") return "global";
    const now = Date.now();
    if (
      voiceContextSnapshot.chatIndex
      && voiceContextSnapshot.ts
      && now - voiceContextSnapshot.ts < VOICE_CONTEXT_SNAPSHOT_TTL_MS
    ) {
      return voiceContextSnapshot.chatIndex;
    }
    const chatIndex = await api.getCurrentChatIndex().catch(() => "global");
    voiceContextSnapshot = {
      ...voiceContextSnapshot,
      chatIndex: String(chatIndex ?? "global"),
      ts: now,
    };
    return String(chatIndex ?? "global");
  }

  function findVoiceCharacterBySpeakerCached(speakerName, currentBotId) {
    if (!speakerName) return null;
    const key = `${currentBotId || "global"}|${speakerName}`;
    const now = Date.now();
    const cached = speakerMatchCacheByBot.get(key);
    if (cached && now - cached.ts < SPEAKER_MATCH_CACHE_TTL_MS) {
      return cached.result;
    }
    const result = findVoiceCharacterBySpeaker(speakerName, currentBotId);
    if (speakerMatchCacheByBot.size >= 200) {
      const firstKey = speakerMatchCacheByBot.keys().next().value;
      if (firstKey) speakerMatchCacheByBot.delete(firstKey);
    }
    speakerMatchCacheByBot.set(key, { result, ts: now });
    return result;
  }

  async function refreshCurrentCharacterSnapshot() {
    const character = await api.getCharacter().catch(() => null);
    const idNow = getCharacterId(character);
    const idChanged = lastKnownCharacterId && lastKnownCharacterId !== idNow;
    lastKnownCharacterId = idNow;
    invalidateVoiceContextSnapshot();
    if (idChanged && typeof speakerMatchCacheByBot !== "undefined" && speakerMatchCacheByBot) {
      speakerMatchCacheByBot.clear();
    }
    return character;
  }

  async function refreshCurrentCharacterSnapshotForDisplay() {
    const now = Date.now();
    if (now - lastDisplayCharacterRefreshAt < DISPLAY_CHARACTER_REFRESH_INTERVAL_MS) return null;
    lastDisplayCharacterRefreshAt = now;
    return refreshCurrentCharacterSnapshot();
  }

  function getCharacterId(character) {
    if (!character) return "global";
    return String(character.chaId || character.id || character.name || "global");
  }

  async function getCurrentPlaybackBotId() {
    try {
      const character = await api.getCharacter();
      const characterId = getCharacterId(character);
      lastKnownCharacterId = characterId;
      return characterId;
    } catch {
      return lastKnownCharacterId || "";
    }
  }

  async function isPlaybackOwnerStillCurrent(ownerBotId) {
    const owner = String(ownerBotId || "").trim();
    if (!owner) return true;
    const currentBotId = await getCurrentPlaybackBotId();
    return !currentBotId || currentBotId === owner;
  }

  async function ensureReadAllOwnerStillCurrent(ownerBotId, contentHash, sequenceId, trigger) {
    if (activeReadAllSequenceId !== sequenceId || activeReadAllContentHash !== contentHash) return false;
    if (!await hasVisibleSpeakerButtonsForContentHash(contentHash)) {
      await stopPlaybackForNavigation("읽던 메시지가 화면에서 사라졌습니다.", {
        trigger,
        contentHash,
      });
      return false;
    }
    if (await isPlaybackOwnerStillCurrent(ownerBotId)) return true;
    const currentBotId = lastKnownCharacterId || "";
    await stopPlaybackForNavigation("봇 또는 화면이 바뀌었습니다.", {
      trigger,
      fromBotId: ownerBotId || "",
      toBotId: currentBotId,
    });
    return false;
  }

  function characterColorForCharacterId(characterId, fallbackName = "") {
    const referenceSet = voiceReferencesByCharacter?.[characterId] || null;
    return characterColorFromReferenceSet(referenceSet, characterId, fallbackName);
  }

  function makeRandomTtsSeed() {
    try {
      if (globalThis.crypto?.getRandomValues) {
        const values = new Uint32Array(2);
        globalThis.crypto.getRandomValues(values);
        return Number((BigInt(values[0]) << 21n) ^ BigInt(values[1] & 0x1fffff));
      }
    } catch {
      // Fall back to Math.random below.
    }
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  }

  function buttonVoicePreviewCacheKey(options = {}) {
    return [
      lastKnownCharacterId || "global",
      options.speakerName || "",
      options.speakerCueGender || "",
      options.segmentKind || "line",
      getVoiceSeedForHash(),
    ].join("\u0001");
  }

  function buttonVoicePreview(options = {}, previewCache = null) {
    const cache = previewCache instanceof Map ? previewCache : null;
    const cacheKey = cache ? buttonVoicePreviewCacheKey(options) : "";
    if (cache && cache.has(cacheKey)) return cache.get(cacheKey);
    const speakerName = options.speakerName || "";
    const segmentKind = options.segmentKind || "line";
    const currentBotId = lastKnownCharacterId || "global";
    const matched = speakerName ? findVoiceCharacterBySpeaker(speakerName, currentBotId) : null;
    if (matched?.referenceSet) {
      const characterId = matched.key || matched.referenceSet.characterId || "";
      const characterName = matched.referenceSet.characterName || speakerName;
      const voice = selectedVoiceForCharacterId(characterId);
      if (voice) {
        const preview = {
          characterId,
          characterName,
          voice,
          color: characterColorFromReferenceSet(matched.referenceSet, characterId, characterName),
        };
        if (cache) cache.set(cacheKey, preview);
        return preview;
      }
    }
    const globalFallback = globalFallbackForPayload({
      speakerName,
      speakerCueGender: options.speakerCueGender || "",
      segmentKind,
    });
    if (globalFallback) {
      const referenceSet = voiceReferencesByCharacter?.[globalFallback.characterId]
        || defaultGlobalReferenceSetForId(globalFallback.characterId);
      const preview = {
        characterId: globalFallback.characterId,
        characterName: globalFallback.characterName,
        voice: selectedVoiceForCharacterId(globalFallback.characterId) || config.defaultVoice || "none",
        color: characterColorFromReferenceSet(referenceSet, globalFallback.characterId, globalFallback.characterName),
      };
      if (cache) cache.set(cacheKey, preview);
      return preview;
    }
    if (matched?.referenceSet) {
      const characterId = matched.key || matched.referenceSet.characterId || "";
      const characterName = matched.referenceSet.characterName || speakerName;
      const preview = {
        characterId,
        characterName,
        voice: config.defaultVoice || "none",
        color: characterColorFromReferenceSet(matched.referenceSet, characterId, characterName),
      };
      if (cache) cache.set(cacheKey, preview);
      return preview;
    }
    if (cache) cache.set(cacheKey, null);
    return null;
  }

  function isRealRisuCharacter(character) {
    if (!character || typeof character !== "object") return false;
    const rawId = String(character.chaId || character.id || "").trim();
    const rawName = String(character.name || "").trim();
    if (!rawId && !rawName) return false;
    const id = (rawId || rawName).toLowerCase();
    const name = rawName.toLowerCase();
    if (id === "global" || name === "global") return false;
    if (id === GLOBAL_BOT_ID.toLowerCase()) return false;
    return true;
  }

  async function requestSpeech(text, voice, emotionDirection = null, statusContext = {}) {
    const endpoint = `${normalizeServerUrl(config.serverUrl)}/v1/audio/speech`;
    const headers = buildTtsHeaders(true);
    const forceRegenerate = config.ttsCacheMode === TTS_CACHE_MODE_REGENERATE;
    const fixedDebugSeed = debugTtsSeedValue();
    const ttsSeed = fixedDebugSeed !== null ? fixedDebugSeed : (forceRegenerate ? makeRandomTtsSeed() : null);
    const body = {
      model: config.ttsModel || "irodori-tts",
      input: text,
      response_format: config.responseFormat || "wav",
      speed: config.speed,
      irodori: {
        num_steps: config.numSteps,
        cfg_scale_text: config.cfgScaleText,
        cfg_scale_speaker: config.cfgScaleSpeaker,
        cfg_scale_caption: config.cfgScaleCaption,
        ref_normalize_db: config.referenceVolumeNormalize ? -16 : null,
        ref_ensure_max: true,
        chunking_enabled: true,
        chunk_min_chars: config.chunkMinChars,
        cuda_cache_cleanup: config.cudaCacheCleanupMode || CUDA_CACHE_CLEANUP_MODE_OFF,
      },
    };

    if (voice) body.voice = voice;
    if (ttsSeed !== null) body.irodori.seed = ttsSeed;
    if (emotionDirection?.captionJa) {
      body.irodori.caption = emotionDirection.captionJa;
      body.caption = emotionDirection.captionJa;
    }

    lastTtsRequestDebug = {
      at: new Date().toLocaleString(),
      endpoint,
      model: body.model,
      voice: body.voice || "none",
      responseFormat: body.response_format,
      speed: body.speed,
      cacheMode: config.ttsCacheMode,
      seed: ttsSeed,
      fixedDebugSeed: fixedDebugSeed !== null,
      irodori: body.irodori,
      input: text,
      emotion: emotionDirection?.emotion || "",
      emotionApplyMode: config.emotionDirectorApplyMode,
      emotionCaption: emotionDirection?.captionJa || "",
      emotionEmoji: emotionDirectorUsesEmoji() ? (emotionDirection?.emotionEmoji || "") : "",
    };
    refreshLastTtsRequestDebugView();

    addRuntimeLog("TTS 서버 요청", {
      endpoint,
      model: body.model,
      voice: body.voice || "none",
      responseFormat: body.response_format,
      speed: body.speed,
      cacheMode: config.ttsCacheMode,
      seed: ttsSeed,
      fixedDebugSeed: fixedDebugSeed !== null,
      irodori: body.irodori,
      input: text,
      emotion: emotionDirection?.emotion || "",
      emotionApplyMode: config.emotionDirectorApplyMode,
      emotionCaption: emotionDirection?.captionJa || "",
      emotionEmoji: emotionDirectorUsesEmoji() ? (emotionDirection?.emotionEmoji || "") : "",
    });
    notifyHelperStatus("TTS 생성 시작", {
      speakerName: statusContext.speakerName || "",
      characterName: statusContext.characterName || "",
      voice: voice || "none",
      text,
    });
    try {
      let response = await api.nativeFetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok && body.irodori?.caption && (response.status === 400 || response.status === 422)) {
        const message = await response.text().catch(() => "");
        addRuntimeLog("TTS 캡션 재시도", {
          status: response.status,
          message: message.slice(0, 200),
          "후속 처리": "irodori.caption을 제거하고 다시 요청합니다.",
        });
        delete body.irodori.caption;
        response = await api.nativeFetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(`TTS 서버가 HTTP ${response.status}를 반환했습니다: ${message.slice(0, 200)}`);
      }

      const mimeType = response.headers?.get?.("content-type") || mimeForFormat(config.responseFormat);
      const arrayBuffer = await response.arrayBuffer().catch((error) => {
        throw new Error(`TTS 응답 오디오를 읽지 못했습니다: ${describeError(error)}`);
      });
      const blob = new Blob([arrayBuffer], { type: mimeType });
      addRuntimeLog("TTS 서버 응답", {
        status: response.status,
        mimeType,
        bytes: arrayBuffer.byteLength,
        voice: voice || "none",
      });
      notifyHelperStatus("TTS 생성 완료", {
        speakerName: statusContext.speakerName || "",
        characterName: statusContext.characterName || "",
        voice: voice || "none",
        text,
        bytes: arrayBuffer.byteLength,
      });
      return {
        url: URL.createObjectURL(blob),
        mimeType,
        bytes: arrayBuffer.byteLength,
        createdAt: Date.now(),
      };
    } catch (error) {
      notifyHelperStatus("TTS 생성 실패", {
        speakerName: statusContext.speakerName || "",
        characterName: statusContext.characterName || "",
        voice: voice || "none",
        text,
        error: describeError(error),
      });
      throw error;
    }
  }

  async function audioEntryFromResponse(response, fallbackMimeType, context) {
    if (!response) {
      throw new Error(`${context} 응답이 비어 있습니다.`);
    }
    if (!response.ok) {
      const message = await response.text().catch((error) => `응답 본문 읽기 실패: ${describeError(error)}`);
      throw new Error(`${context}가 HTTP ${response.status}를 반환했습니다: ${message.slice(0, 300)}`);
    }
    const mimeType = response.headers?.get?.("content-type") || fallbackMimeType || "audio/wav";
    const arrayBuffer = await response.arrayBuffer().catch((error) => {
      throw new Error(`${context} 오디오를 읽지 못했습니다: ${describeError(error)}`);
    });
    const blob = new Blob([arrayBuffer], { type: mimeType });
    return {
      url: URL.createObjectURL(blob),
      mimeType,
      bytes: arrayBuffer.byteLength,
      createdAt: Date.now(),
    };
  }

  async function requestAudioFile(url) {
    const attempts = [
      {
        label: "browser GET",
        run: async () => fetch(url, { method: "GET" }),
      },
      {
        label: "native GET(no interceptor)",
        run: async () => api.nativeFetch(url, {
          method: "GET",
          headers: buildTtsHeaders(false),
          interceptor: false,
        }),
      },
      {
        label: "native GET",
        run: async () => api.nativeFetch(url, {
          method: "GET",
          headers: buildTtsHeaders(false),
        }),
      },
    ];
    const errors = [];
    for (const attempt of attempts) {
      try {
        const response = await attempt.run();
        return await audioEntryFromResponse(response, "audio/wav", `Audio preview ${attempt.label}`);
      } catch (error) {
        errors.push(`${attempt.label}: ${describeError(error)}`);
      }
    }
    throw new Error(errors.join(" | "));
  }

  async function requestReferenceAudioByVoiceId(voiceId) {
    const url = helperAudioPostUrl();
    if (!url) {
      throw new Error("보이스 레퍼런스 Helper POST 미리듣기 주소를 만들 수 없습니다.");
    }
    const body = JSON.stringify({ voiceId });
    const attempts = [
      {
        label: "native POST(no interceptor)",
        run: async () => api.nativeFetch(url, {
          method: "POST",
          headers: buildTtsHeaders(true),
          body,
          interceptor: false,
        }),
      },
      {
        label: "native POST",
        run: async () => api.nativeFetch(url, {
          method: "POST",
          headers: buildTtsHeaders(true),
          body,
        }),
      },
      {
        label: "browser POST",
        run: async () => fetch(url, {
          method: "POST",
          headers: buildTtsHeaders(true),
          body,
        }),
      },
    ];
    const errors = [];
    for (const attempt of attempts) {
      try {
        const response = await attempt.run();
        return await audioEntryFromResponse(response, "audio/wav", `Audio preview ${attempt.label}`);
      } catch (error) {
        errors.push(`${attempt.label}: ${describeError(error)}`);
      }
    }
    throw new Error(errors.join(" | "));
  }

  async function requestHealth(url) {
    const attempts = [
      {
        label: "browser GET",
        run: async () => fetch(url, { method: "GET" }),
      },
      {
        label: "native GET(no interceptor)",
        run: async () => api.nativeFetch(url, { method: "GET", headers: {}, interceptor: false }),
      },
      {
        label: "native GET",
        run: async () => api.nativeFetch(url, { method: "GET", headers: {} }),
      },
      {
        label: "native GET(empty body)",
        run: async () => api.nativeFetch(url, { method: "GET", headers: {}, body: "", interceptor: false }),
      },
    ];
    const errors = [];
    for (const attempt of attempts) {
      try {
        const response = await attempt.run();
        return {
          response,
          text: await response.text(),
        };
      } catch (error) {
        errors.push(`${attempt.label}: ${describeError(error)}`);
      }
    }
    throw new Error(errors.join(" | "));
  }

  async function requestTtsServerVoiceList() {
    const url = `${normalizeServerUrl(config.serverUrl)}/v1/audio/voices`;
    const attempts = [
      {
        label: "browser GET",
        run: async () => fetch(url, {
          method: "GET",
          headers: buildTtsHeaders(false),
        }),
      },
      {
        label: "native GET(no interceptor)",
        run: async () => api.nativeFetch(url, {
          method: "GET",
          headers: buildTtsHeaders(false),
          interceptor: false,
        }),
      },
      {
        label: "native GET",
        run: async () => api.nativeFetch(url, {
          method: "GET",
          headers: buildTtsHeaders(false),
        }),
      },
    ];
    const errors = [];
    for (const attempt of attempts) {
      try {
        const response = await attempt.run();
        const text = await response.text().catch(() => "");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${text.slice(0, 240)}`);
        }
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          throw new Error(`voices 응답을 JSON으로 읽지 못했습니다: ${text.slice(0, 160)}`);
        }
        const items = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.voices)
            ? data.voices
            : [];
        return items
          .map((voice) => ({
            voiceId: String(voice?.id || voice?.voice_id || voice?.voiceId || voice?.label || "").trim(),
            refWav: String(voice?.ref_wav || voice?.file || "").trim(),
            noRef: Boolean(voice?.no_ref),
          }))
          .filter((voice) => Boolean(voice.voiceId));
      } catch (error) {
        errors.push(`${attempt.label}: ${describeError(error)}`);
      }
    }
    throw new Error(errors.join(" | "));
  }

  async function requestHelperVoiceList() {
    const url = helperVoiceListUrl();
    if (!url) {
      throw new Error("보이스 레퍼런스 Helper 목록 주소를 만들 수 없습니다.");
    }
    const attempts = [
      {
        label: "browser GET",
        run: async () => fetch(url, { method: "GET" }),
      },
      {
        label: "native GET(no interceptor)",
        run: async () => api.nativeFetch(url, { method: "GET", headers: {}, interceptor: false }),
      },
      {
        label: "native GET",
        run: async () => api.nativeFetch(url, { method: "GET", headers: {} }),
      },
    ];
    const errors = [];
    for (const attempt of attempts) {
      try {
        const response = await attempt.run();
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`HTTP ${response.status}: ${text.slice(0, 240)}`);
        }
        const data = await response.json();
        const voices = Array.isArray(data?.voices) ? data.voices : [];
        return voices
          .map((voice) => ({
            voiceId: String(voice?.voiceId || voice?.id || voice?.label || "").trim(),
            label: String(voice?.label || voice?.voiceId || voice?.id || "").trim(),
            file: String(voice?.file || "").trim(),
            previewUrl: String(voice?.previewUrl || "").trim(),
            size: Number(voice?.size || 0),
            mtime: String(voice?.mtime || "").trim(),
          }))
          .filter((voice) => Boolean(voice.voiceId));
      } catch (error) {
        errors.push(`${attempt.label}: ${describeError(error)}`);
      }
    }
    throw new Error(errors.join(" | "));
  }

  async function requestHelperVoiceMetadata() {
    const url = helperVoiceMetadataUrl();
    if (!url) return null;
    const attempts = [
      {
        label: "browser GET",
        run: async () => fetch(url, { method: "GET" }),
      },
      {
        label: "native GET(no interceptor)",
        run: async () => api.nativeFetch(url, { method: "GET", headers: {}, interceptor: false }),
      },
      {
        label: "native GET",
        run: async () => api.nativeFetch(url, { method: "GET", headers: {} }),
      },
    ];
    for (const attempt of attempts) {
      try {
        const response = await attempt.run();
        if (!response.ok) continue;
        const data = await response.json();
        if (data?.ok === false) continue;
        const metadata = data?.metadata || null;
        return metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? metadata
          : null;
      } catch {
        // Helper may not be running yet.
      }
    }
    return null;
  }

  function registeredVoiceIds() {
    const ids = new Set();
    for (const referenceSet of Object.values(voiceReferencesByCharacter || {})) {
      for (const reference of referenceItems(referenceSet)) {
        const voiceId = String(reference?.voiceId || "").trim();
        if (voiceId) ids.add(voiceId);
      }
    }
    return ids;
  }

  function auditRegisteredVoiceFiles(voices) {
    const available = new Set((Array.isArray(voices) ? voices : []).map((voice) => voice.voiceId).filter(Boolean));
    const missing = [];
    for (const [characterId, referenceSet] of Object.entries(voiceReferencesByCharacter || {})) {
      referenceItems(referenceSet).forEach((reference, index) => {
        const voiceId = String(reference?.voiceId || "").trim();
        if (!voiceId) return;
        const isMissing = !available.has(voiceId);
        reference.fileMissing = isMissing;
        if (isMissing) {
          missing.push({
            characterId,
            characterName: referenceSet?.characterName || characterId,
            index,
            voiceId,
            label: reference.label || voiceId,
          });
        }
      });
    }
    return missing;
  }

  function summarizeMissingReferenceCharacters(missing) {
    const names = [];
    const seen = new Set();
    for (const item of Array.isArray(missing) ? missing : []) {
      const name = String(item?.characterName || "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
    if (!names.length) return "";
    const visible = names.slice(0, 3).join(", ");
    const rest = names.length - 3;
    return rest > 0 ? `${visible} 외 ${rest}명` : visible;
  }

  function unregisteredVoiceFiles(voices) {
    const registered = registeredVoiceIds();
    return (Array.isArray(voices) ? voices : []).filter((voice) => voice?.voiceId && !registered.has(voice.voiceId));
  }

  function referenceFromVoiceFile(voice) {
    const voiceId = String(voice?.voiceId || "").trim();
    return {
      id: voiceId,
      label: String(voice?.label || voiceId).trim() || voiceId,
      voiceId,
      file: String(voice?.file || "").trim(),
      previewUrl: String(voice?.previewUrl || helperAudioUrlForVoice(voiceId)).trim(),
      imported: true,
      importedAt: new Date().toISOString(),
      size: Number(voice?.size || 0),
      mtime: String(voice?.mtime || "").trim(),
      fileMissing: false,
    };
  }

  function clearCurrentAudioButton() {
    if (typeof currentAudioReset === "function") {
      const reset = currentAudioReset;
      currentAudioReset = null;
      try {
        const result = reset();
        if (result && typeof result.catch === "function") result.catch(() => {});
      } catch {
        // Ignore reset failures; playback state will be refreshed on the next DOM scan.
      }
    }
  }

  function stopCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    clearCurrentAudioButton();
    clearCurrentAudioDispose();
    currentAudio = null;
    currentAudioKey = "";
    currentAudioPayloadId = "";
    currentAudioOwnerBotId = "";
    activePlaybackOwnerBotId = "";
    if (typeof updatePlayingHighlight === "function") updatePlayingHighlight("").catch(() => {});
  }

  async function stopPlaybackForNavigation(reason, details = {}) {
    const activePayloadIds = [...activeChatButtonStates.keys()];
    const hadWork = Boolean(currentAudio || activeReadAllContentHash || activePayloadIds.length);
    if (!hadWork) return false;

    latestChatPlaybackRequestId += 1;
    const readAllContentHash = activeReadAllContentHash;
    activeReadAllSequenceId += 1;
    activeReadAllContentHash = "";
    activeReadAllOwnerBotId = "";
    activeReadAllStopAllowedAt = 0;
    stopCurrentAudio();

    for (const payloadId of activePayloadIds) {
      const active = activeChatButtonStates.get(payloadId);
      activeChatButtonStates.delete(payloadId);
      await syncChatButtonPayloadState(payloadId, "idle", active?.mode || "ja").catch(() => {});
    }
    if (readAllContentHash) {
      await setReadAllButtonsState(readAllContentHash, "idle").catch(() => {});
    }
    noChatButtonAudioScanCount = 0;
    addRuntimeLog("화면 전환으로 TTS 중단", {
      reason,
      ...details,
    });
    return true;
  }

  async function stopPlaybackIfContextChanged(trigger = "", buttonCount = null) {
    const hasPlayingOrReadAllWork = Boolean(currentAudio || activeReadAllContentHash);
    const hasWork = Boolean(hasPlayingOrReadAllWork || activeChatButtonStates.size);
    if (!hasWork) {
      noChatButtonAudioScanCount = 0;
      return false;
    }
    if (config.autoStopOnContextChange === false) {
      noChatButtonAudioScanCount = 0;
      return false;
    }

    const activeContentHash = activeReadAllContentHash
      || (currentAudioPayloadId ? payloads.get(currentAudioPayloadId)?.contentHash : "")
      || "";
    if (activeContentHash && !await hasVisibleSpeakerButtonsForContentHash(activeContentHash)) {
      return await stopPlaybackForNavigation("읽던 메시지가 화면에서 사라졌습니다.", {
        trigger,
        contentHash: activeContentHash,
      });
    }

    const ownerBotId = currentAudioOwnerBotId || activeReadAllOwnerBotId || activePlaybackOwnerBotId || "";
    let currentBotId = "";
    let characterKnown = false;
    try {
      const character = await api.getCharacter();
      currentBotId = getCharacterId(character);
      characterKnown = true;
    } catch {
      characterKnown = false;
    }

    if (characterKnown && ownerBotId && currentBotId && currentBotId !== ownerBotId) {
      return await stopPlaybackForNavigation("봇 또는 화면이 바뀌었습니다.", {
        trigger,
        fromBotId: ownerBotId,
        toBotId: currentBotId,
      });
    }

    if (Number.isFinite(Number(buttonCount))) {
      if (!hasPlayingOrReadAllWork) {
        noChatButtonAudioScanCount = 0;
        return false;
      }
      if (Number(buttonCount) <= 0) {
        noChatButtonAudioScanCount += 1;
      } else {
        noChatButtonAudioScanCount = 0;
      }
      if (noChatButtonAudioScanCount >= 2) {
        return await stopPlaybackForNavigation("채팅 화면을 벗어난 것으로 판단했습니다.", {
          trigger,
          buttonCount,
        });
      }
    }

    return false;
  }

  function clearCurrentAudioDispose() {
    if (typeof currentAudioDispose === "function") {
      const dispose = currentAudioDispose;
      currentAudioDispose = null;
      try {
        dispose();
      } catch {
        // Ignore dispose failures. Object URLs are also cleaned when cache entries are evicted.
      }
    }
  }

  function disposeAudioEntry(entry) {
    if (!entry || !entry.url) return;
    try {
      URL.revokeObjectURL(entry.url);
    } catch {
      // Object URL cleanup is best-effort.
    }
  }

  function isCurrentAudioPlaying() {
    return Boolean(currentAudio && !currentAudio.paused);
  }

  function isCurrentAudioPlayingForPayload(payloadId) {
    return Boolean(payloadId && isCurrentAudioPlaying() && currentAudioPayloadId === payloadId);
  }

  function waitForAudioReady(audio, timeoutMs = 900) {
    if (!audio) return Promise.resolve();
    if (audio.readyState >= 3) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve();
      };
      const cleanup = () => {
        audio.removeEventListener("canplay", finish);
        audio.removeEventListener("canplaythrough", finish);
        audio.removeEventListener("loadeddata", finish);
      };
      audio.addEventListener("canplay", finish, { once: true });
      audio.addEventListener("canplaythrough", finish, { once: true });
      audio.addEventListener("loadeddata", finish, { once: true });
      audio.load();
      setTimeout(finish, timeoutMs);
    });
  }

  function waitForAudioEnd(audio) {
    if (!audio) return Promise.resolve("stopped");
    if (audio.ended) return Promise.resolve("ended");
    return new Promise((resolve) => {
      let done = false;
      const finish = (state) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(state);
      };
      const cleanup = () => {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("error", onError);
      };
      const onEnded = () => finish("ended");
      const onPause = () => {
        setTimeout(() => finish(audio.ended ? "ended" : "stopped"), 0);
      };
      const onError = () => finish("error");
      audio.addEventListener("ended", onEnded, { once: true });
      audio.addEventListener("pause", onPause, { once: true });
      audio.addEventListener("error", onError, { once: true });
    });
  }

  function makeSilentWavUrl(durationMs = 160) {
    const sampleRate = 44100;
    const channels = 1;
    const bytesPerSample = 2;
    const sampleCount = Math.max(1, Math.ceil(sampleRate * durationMs / 1000));
    const dataSize = sampleCount * channels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeAscii = (offset, text) => {
      for (let i = 0; i < text.length; i += 1) {
        view.setUint8(offset + i, text.charCodeAt(i));
      }
    };
    writeAscii(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(8, "WAVE");
    writeAscii(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bytesPerSample, true);
    view.setUint16(32, channels * bytesPerSample, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeAscii(36, "data");
    view.setUint32(40, dataSize, true);
    return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  }

  async function primeAudioOutputIfNeeded() {
    const now = Date.now();
    if (now - lastAudioPrimeAt < 3500) return;
    lastAudioPrimeAt = now;
    const url = makeSilentWavUrl(AUDIO_PRIME_SILENCE_MS);
    const audio = new Audio(url);
    audio.preload = "auto";
    try {
      await waitForAudioReady(audio, AUDIO_PRIME_PLAY_WAIT_MS);
      await Promise.race([
        audio.play(),
        new Promise((resolve) => setTimeout(resolve, AUDIO_PRIME_PLAY_WAIT_MS)),
      ]);
      await new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        audio.addEventListener("ended", finish, { once: true });
        setTimeout(finish, AUDIO_PRIME_PLAY_WAIT_MS);
      });
    } catch {
      // If the silent prime fails, normal playback should still be attempted.
    } finally {
      try {
        audio.pause();
        audio.src = "";
      } catch {
        // Ignore cleanup failures.
      }
      URL.revokeObjectURL(url);
    }
  }

  async function playAudioEntry(entry, audioKey = "", onStateChange = null, options = {}) {
    const metrics = options?.metrics && typeof options.metrics === "object" ? options.metrics : null;
    const audioStartedAt = monotonicNow();
    if (options.toggleIfSameAudioKey !== false && audioKey && currentAudio && currentAudioKey === audioKey && !currentAudio.paused) {
      stopCurrentAudio();
      if (metrics) {
        metrics.audioPrepareMs = elapsedMsSince(audioStartedAt);
        metrics.audioStartMs = metrics.audioPrepareMs;
      }
      return "stopped";
    }
    stopCurrentAudio();
    await primeAudioOutputIfNeeded().catch(() => {});
    addRuntimeLog("TTS 브라우저 재생 준비", {
      payloadId: String(options.payloadId || ""),
      ownerBotId: String(options.ownerBotId || activePlaybackOwnerBotId || ""),
      audioKeyHash: hashText(audioKey || ""),
      bytes: entry?.bytes || 0,
      mimeType: entry?.mimeType || "",
      waitForEnd: Boolean(options.waitForEnd),
    });
    currentAudio = new Audio(entry.url);
    currentAudio.preload = "auto";
    currentAudio.muted = false;
    currentAudio.volume = (typeof overlayConfig !== "undefined" && Number.isFinite(overlayConfig.volume)) ? overlayConfig.volume / 100 : 1;
    if (typeof overlayConfig !== "undefined" && Number.isFinite(overlayConfig.speed)) {
      try { currentAudio.playbackRate = overlayConfig.speed; } catch (e) {}
    }
    const playbackAudio = currentAudio;
    currentAudioKey = audioKey || "";
    currentAudioPayloadId = String(options.payloadId || "");
    currentAudioOwnerBotId = String(options.ownerBotId || activePlaybackOwnerBotId || "");
    currentAudioDispose = options.disposeAfterPlayback ? () => disposeAudioEntry(entry) : null;
    if (typeof onStateChange === "function") {
      currentAudioReset = () => onStateChange("idle");
    }
    currentAudio.addEventListener("ended", () => {
      if (currentAudio === playbackAudio && currentAudioKey === audioKey) {
        currentAudio = null;
        currentAudioKey = "";
        currentAudioPayloadId = "";
        currentAudioOwnerBotId = "";
        activePlaybackOwnerBotId = "";
        clearCurrentAudioButton();
        clearCurrentAudioDispose();
      }
    }, { once: true });
    try {
      await waitForAudioReady(playbackAudio);
      playbackAudio.currentTime = 0;
      if (currentAudio !== playbackAudio) return "superseded";
      await new Promise((resolve) => setTimeout(resolve, AUDIO_PLAY_START_DELAY_MS));
      if (currentAudio !== playbackAudio) return "superseded";
      if (metrics) {
        metrics.audioPrepareMs = elapsedMsSince(audioStartedAt);
      }
      try {
        await playbackAudio.play();
      } catch (primaryPlayError) {
        // Chrome 자동재생 정책 (NotAllowedError) — 음소거 재생 후 즉시 음소거 해제
        // 음소거된 자동재생은 항상 허용되므로 이 패턴으로 우회
        const errName = String(primaryPlayError?.name || "");
        addRuntimeLog("TTS play() 1차 거부, 음소거 재생 시도", {
          errorName: errName,
          errorMessage: String(primaryPlayError?.message || ""),
        });
        if (errName === "NotAllowedError" || errName === "AbortError") {
          playbackAudio.muted = true;
          await playbackAudio.play();
          playbackAudio.muted = false;
          addRuntimeLog("TTS 음소거 재생 → 음소거 해제 성공", {});
        } else {
          throw primaryPlayError;
        }
      }
      if (metrics) {
        metrics.audioStartMs = elapsedMsSince(audioStartedAt);
      }
      if (typeof onStateChange === "function") onStateChange("playing");
      addRuntimeLog("TTS 브라우저 재생 시작", {
        payloadId: currentAudioPayloadId,
        audioKeyHash: hashText(audioKey || ""),
        paused: playbackAudio.paused,
        muted: playbackAudio.muted,
        volume: playbackAudio.volume,
        duration: Number.isFinite(playbackAudio.duration) ? Number(playbackAudio.duration.toFixed(3)) : "",
      });
      if (options.waitForEnd) return await waitForAudioEnd(playbackAudio);
      return "playing";
    } catch (error) {
      addRuntimeLog("TTS 브라우저 재생 실패", {
        payloadId: currentAudioPayloadId,
        audioKeyHash: hashText(audioKey || ""),
        error: describeError(error),
      });
      if (currentAudioKey === audioKey) {
        currentAudio = null;
        currentAudioKey = "";
        currentAudioPayloadId = "";
        currentAudioOwnerBotId = "";
        activePlaybackOwnerBotId = "";
        clearCurrentAudioButton();
        clearCurrentAudioDispose();
      }
      throw error;
    }
  }

  async function playReferencePreview(voiceId, previewUrl, sampleText = "", report = async () => {}, onStateChange = null) {
    if (!voiceId) {
      throw new Error("레퍼런스 보이스 ID가 없습니다.");
    }
    if (!previewUrl) {
      throw new Error("레퍼런스 wav 미리듣기 주소가 없습니다. 보이스 레퍼런스 Helper를 켠 뒤 레퍼런스를 다시 생성하세요.");
    }

    const cacheKey = `reference-preview:${voiceId}:${previewUrl || ""}`;
    let entry = audioCache.get(cacheKey);
    if (!entry) {
      await report("레퍼런스 wav 파일을 불러오는 중...");
      try {
        entry = await requestAudioFile(previewUrl);
      } catch (error) {
        await report([
          "GET 미리듣기에 실패해 POST 방식으로 다시 시도합니다.",
          `GET 오류: ${describeError(error)}`,
        ].join("\n"));
        try {
          entry = await requestReferenceAudioByVoiceId(voiceId);
        } catch (postError) {
          const fallbackText = cleanVoiceDesignSampleText(sampleText) || PREVIEW_TEXT;
          await report([
            "helper 미리듣기에 실패해 TTS 서버로 레퍼런스 생성용 대사를 짧게 합성합니다.",
            `POST 오류: ${describeError(postError)}`,
            `사용 대사: ${fallbackText}`,
          ].join("\n"));
          entry = await requestSpeech(fallbackText, voiceId);
        }
      }
      setAudioCache(cacheKey, entry);
    } else {
      await report(`캐시된 레퍼런스 wav 사용 (${formatBytes(entry.bytes)}).`);
    }

    const state = await playAudioEntry(entry, cacheKey, onStateChange);
    await report(state === "stopped" ? `레퍼런스 ${voiceId} 재생을 멈췄습니다.` : `레퍼런스 ${voiceId} 재생 중입니다.`);
    return state;
  }

  function setPreviewButtonState(button, state) {
    if (!button) return;
    if (state === "loading") {
      button.disabled = true;
      button.classList.remove("playing");
      button.textContent = "...";
      return;
    }
    button.disabled = false;
    if (state === "playing") {
      button.classList.add("playing");
      button.innerHTML = "&#9632;";
      button.title = "재생 정지";
      button.setAttribute("aria-label", "재생 정지");
      return;
    }
    button.classList.remove("playing");
    button.innerHTML = "&#128266;";
    button.title = "레퍼런스 듣기";
    button.setAttribute("aria-label", "레퍼런스 듣기");
  }

  async function deleteReferenceVoiceFile(voiceId) {
    if (!voiceId) {
      throw new Error("삭제할 레퍼런스 보이스 ID가 없습니다.");
    }
    const url = helperAudioUrlForVoice(voiceId);
    if (!url) {
      throw new Error("보이스 레퍼런스 Helper 주소를 만들 수 없습니다.");
    }
    const response = await api.nativeFetch(url, {
      method: "DELETE",
      headers: buildTtsHeaders(false),
    });
    if (response.status === 404) {
      return false;
    }
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`보이스 레퍼런스 Helper가 HTTP ${response.status}를 반환했습니다: ${message.slice(0, 200)}`);
    }
    return true;
  }

  async function renameReferenceVoiceFile(voiceId, newVoiceId) {
    const oldId = String(voiceId || "").trim();
    const nextId = sanitizeVoiceId(newVoiceId);
    if (!oldId) {
      throw new Error("이름을 바꿀 레퍼런스 보이스 ID가 없습니다.");
    }
    if (!nextId) {
      throw new Error("새 보이스 ID를 입력하세요.");
    }
    const url = helperRenameUrl();
    if (!url) {
      throw new Error("보이스 레퍼런스 Helper 이름 변경 주소를 만들 수 없습니다.");
    }
    const response = await api.nativeFetch(url, {
      method: "POST",
      headers: buildTtsHeaders(true),
      body: JSON.stringify({
        voiceId: oldId,
        newVoiceId: nextId,
      }),
    });
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`보이스 레퍼런스 Helper가 HTTP ${response.status}를 반환했습니다: ${message.slice(0, 200)}`);
    }
    const data = await response.json();
    return {
      voiceId: data.voiceId || nextId,
      label: data.label || data.voiceId || nextId,
      file: data.file || "",
      previewUrl: data.previewUrl || helperAudioUrlForVoice(data.voiceId || nextId),
    };
  }

  function sanitizeVoiceId(value) {
    return String(value || "")
      .trim()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);
  }

  function clearAudioCacheForVoice(voiceId) {
    const voice = String(voiceId || "");
    if (!voice) return;
    for (const [key, entry] of audioCache.entries()) {
      if (key.includes(`:${voice}:`) || key.includes(`:${voice}`) || key.includes(`reference-preview:${voice}:`)) {
        if (entry?.url) {
          URL.revokeObjectURL(entry.url);
        }
        audioCache.delete(key);
      }
    }
  }

  function clearAllAudioCache() {
    let count = 0;
    for (const entry of audioCache.values()) {
      if (entry?.url) {
        URL.revokeObjectURL(entry.url);
      }
      count += 1;
    }
    audioCache.clear();
    return count;
  }

  function setAudioCache(key, entry) {
    audioCache.set(key, entry);
    while (audioCache.size > 50) {
      const oldestKey = audioCache.keys().next().value;
      const oldest = audioCache.get(oldestKey);
      if (oldest?.url) {
        URL.revokeObjectURL(oldest.url);
      }
      audioCache.delete(oldestKey);
    }
  }

  async function requestVoiceReferences(character, caption, count, sampleText) {
    const startedAtMs = Date.now();
    const requestedSampleText = cleanVoiceDesignSampleText(sampleText);
    const outputPrefix = makeVoiceIdBase(character);
    try {
      const result = await requestVoiceReferencesRaw(character, caption, count, sampleText);
      if (!voiceReferenceResponseCount(result)) {
        const recovered = await recoverVoiceReferencesFromHelper({
          character,
          caption,
          count,
          sampleText: requestedSampleText,
          outputPrefix,
          startedAtMs,
          error: new Error("보이스 레퍼런스 생성 응답에 등록할 wav가 없습니다."),
          optional: true,
        });
        if (recovered) return recovered;
      }
      return result;
    } catch (error) {
      const recovered = await recoverVoiceReferencesFromHelper({
        character,
        caption,
        count,
        sampleText: requestedSampleText,
        outputPrefix,
        startedAtMs,
        error,
        optional: false,
      });
      if (recovered) return recovered;
      throw error;
    }
  }

  async function requestVoiceReferencesRaw(character, caption, count, sampleText) {
    if (!config.ttsModelEndpoint) {
      throw new Error("TTS 모델 엔드포인트가 비어 있습니다. 기본값은 http://127.0.0.1:8090/v1/voice-design 입니다.");
    }
    const requestedSampleText = cleanVoiceDesignSampleText(sampleText);
    if (!requestedSampleText) {
      throw new Error("레퍼런스 생성용 대사가 비어 있습니다.");
    }
    const voiceContext = await buildVoiceDesignContext(character).catch(() => ({
      character: compactCharacterSheet(character),
      lorebookEntries: [],
      databaseAccess: "unavailable",
    }));
    addRuntimeLog("보이스 레퍼런스 생성 요청", {
      endpoint: config.ttsModelEndpoint,
      character: character?.name || getCharacterId(character),
      count,
      caption,
      sampleText: requestedSampleText,
      outputPrefix: makeVoiceIdBase(character),
    });
    const response = await api.nativeFetch(config.ttsModelEndpoint, {
      method: "POST",
      headers: buildTtsHeaders(true),
      body: JSON.stringify({
        model: "Aratako/Irodori-TTS-600M-v3-VoiceDesign",
        count,
        caption,
        text: requestedSampleText,
        input: requestedSampleText,
        sampleText: requestedSampleText,
        sample_text: requestedSampleText,
        require_text: true,
        character: voiceContext.character,
        lorebook: voiceContext.lorebookEntries,
        register_voice: true,
        output_prefix: makeVoiceIdBase(character),
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`TTS 모델 엔드포인트가 HTTP ${response.status}를 반환했습니다: ${text.slice(0, 200)}`);
    }
    const contentType = response.headers?.get?.("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      assertVoiceReferenceResponseText(data, requestedSampleText);
      addRuntimeLog("보이스 레퍼런스 생성 응답", {
        status: response.status,
        references: Array.isArray(data.references) ? data.references.length : undefined,
        text: data.text || data.input || data.sampleText || data.sample_text || "",
      });
      return data;
    }
    const result = await response.text();
    addRuntimeLog("보이스 레퍼런스 생성 응답", {
      status: response.status,
      result,
    });
    return { result };
  }

  function voiceReferenceResponseCount(result) {
    if (Array.isArray(result)) return result.length;
    if (Array.isArray(result?.references)) return result.references.length;
    if (Array.isArray(result?.voices)) return result.voices.length;
    if (Array.isArray(result?.files)) return result.files.length;
    return 0;
  }

  function voiceReferenceFileTimeMs(voice) {
    const raw = String(voice?.mtime || "").trim();
    if (!raw) return 0;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function voiceReferenceMatchesPrefix(voice, outputPrefix) {
    const prefix = String(outputPrefix || "").trim();
    if (!prefix) return false;
    const fields = [
      voice?.voiceId,
      voice?.label,
      voice?.file,
    ].map((value) => String(value || ""));
    return fields.some((value) => (
      value.startsWith(`${prefix}_`)
      || value.includes(`\\${prefix}_`)
      || value.includes(`/${prefix}_`)
    ));
  }

  async function recoverVoiceReferencesFromHelper(options) {
    const {
      character,
      caption,
      count,
      sampleText,
      outputPrefix,
      startedAtMs,
      error,
      optional,
    } = options || {};
    try {
      const voices = await requestHelperVoiceList();
      const graceMs = 20000;
      const started = Number(startedAtMs || 0);
      const matched = voices
        .filter((voice) => voiceReferenceMatchesPrefix(voice, outputPrefix))
        .filter((voice) => {
          const mtime = voiceReferenceFileTimeMs(voice);
          return !started || !mtime || mtime >= started - graceMs;
        })
        .sort((a, b) => {
          const diff = voiceReferenceFileTimeMs(a) - voiceReferenceFileTimeMs(b);
          if (diff) return diff;
          return String(a.voiceId || "").localeCompare(String(b.voiceId || ""));
        })
        .slice(-Math.max(1, Number(count) || 1));

      if (!matched.length) {
        addRuntimeLog("보이스 레퍼런스 복구 실패", {
          outputPrefix,
          error: describeError(error),
          voices: voices.length,
          optional: Boolean(optional),
        });
        return null;
      }

      const references = matched.map((voice) => ({
        id: voice.voiceId,
        label: voice.label || voice.voiceId,
        voiceId: voice.voiceId,
        file: voice.file || "",
        previewUrl: voice.previewUrl || helperAudioUrlForVoice(voice.voiceId),
        caption,
        recovered: true,
      }));
      addRuntimeLog("보이스 레퍼런스 복구 등록", {
        outputPrefix,
        recovered: references.length,
        requested: count,
        error: describeError(error),
        voices: references.map((reference) => reference.voiceId),
      });
      return {
        ok: true,
        recovered: true,
        text: sampleText,
        sampleText,
        caption,
        character: character?.name || getCharacterId(character),
        references,
      };
    } catch (recoveryError) {
      addRuntimeLog("보이스 레퍼런스 복구 오류", {
        outputPrefix,
        error: describeError(error),
        recoveryError: describeError(recoveryError),
      });
      return null;
    }
  }

  function assertVoiceReferenceResponseText(data, requestedSampleText) {
    const usedText = cleanVoiceDesignSampleText(
      data?.text || data?.input || data?.sampleText || data?.sample_text || "",
    );
    if (!usedText || usedText === requestedSampleText) return;
    throw new Error([
      "보이스 레퍼런스 Helper가 요청과 다른 대사로 레퍼런스를 생성했습니다.",
      `요청 대사: ${requestedSampleText}`,
      `helper 사용 대사: ${usedText}`,
      "start-risutts.cmd 창을 닫았다가 다시 켠 뒤 같은 레퍼런스를 다시 생성하세요.",
    ].join("\n"));
  }

  function cleanVoiceDesignGuidance(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 800);
  }

  function cleanResearchInput(value, maxLength = 12000) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim()
      .slice(0, maxLength);
  }

  function parseResearchUrls(value) {
    return String(value || "")
      .split(/\n|,|\s+/)
      .map((item) => item.trim())
      .filter((item) => /^https?:\/\//i.test(item))
      .slice(0, 6);
  }

  async function requestCharacterResearch(character, options = {}) {
    const endpoint = helperResearchUrl();
    if (!endpoint) {
      throw new Error("보이스 레퍼런스 Helper 조사 엔드포인트를 만들 수 없습니다.");
    }
    const urls = parseResearchUrls(options.urls || config.voiceDesignResearchUrls);
    const notes = cleanResearchInput(options.notes || config.voiceDesignResearchNotes);
    const guidance = cleanVoiceDesignGuidance(options.guidance || config.voiceDesignGuidance);
    if (!urls.length && !notes) {
      throw new Error("URL이나 조사 메모를 먼저 입력하세요.");
    }
    const voiceContext = await buildVoiceDesignContext(character).catch(() => ({
      character: compactCharacterSheet(character),
      lorebookEntries: [],
      databaseAccess: "unavailable",
    }));
    addRuntimeLog("캐릭터 조사 자료 추출 요청", {
      endpoint,
      character: character?.name || getCharacterId(character),
      urls,
      notesChars: notes.length,
      guidance,
    });
    const response = await api.nativeFetch(endpoint, {
      method: "POST",
      headers: buildTtsHeaders(true),
      body: JSON.stringify({
        character: voiceContext.character,
        lorebook: voiceContext.lorebookEntries,
        urls,
        notes,
        guidance,
        maxSummaryChars: 6000,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`보이스 레퍼런스 Helper 조사 엔드포인트가 HTTP ${response.status}를 반환했습니다: ${text.slice(0, 300)}`);
    }
    const data = await response.json();
    if (!data?.ok) {
      throw new Error(data?.error || "보이스 레퍼런스 Helper 조사 응답이 비어 있습니다.");
    }
    const summary = cleanResearchInput(data.summary || data.researchSummary || "", 12000);
    addRuntimeLog("캐릭터 조사 자료 추출 결과", {
      character: character?.name || getCharacterId(character),
      sourceCount: data.sourceCount,
      summaryChars: summary.length,
      sources: Array.isArray(data.sources)
        ? data.sources.map((source) => ({
            url: source.url,
            title: source.title,
            chars: source.textChars,
            error: source.error,
          }))
        : [],
    });
    return {
      ...data,
      summary,
    };
  }

  async function collectSupplementalResearchForCaption(character, guidance = "") {
    const urls = parseResearchUrls(config.voiceDesignResearchUrls);
    const notes = cleanResearchInput(config.voiceDesignResearchNotes, 6000);
    if (!urls.length && !notes) return "";
    if (!urls.length) return notes;
    const result = await requestCharacterResearch(character, { urls: urls.join("\n"), notes, guidance });
    return cleanResearchInput(result.summary || notes, 8000);
  }

  function parseVoiceResearchDigest(value) {
    const text = responseObjectToJsonText(value);
    const parsed = tryParseJsonObject(text);
    if (parsed) {
      const parts = [];
      for (const key of ["voiceProfile", "speechStyle", "voiceCaptionHints", "sampleLineHints", "summary", "researchSummary"]) {
        if (parsed[key]) parts.push(`${key}: ${String(parsed[key]).trim()}`);
      }
      if (Array.isArray(parsed.voiceTraits) && parsed.voiceTraits.length) {
        parts.push(`voiceTraits: ${parsed.voiceTraits.map((item) => String(item).trim()).filter(Boolean).join(", ")}`);
      }
      if (Array.isArray(parsed.quotePatterns) && parsed.quotePatterns.length) {
        parts.push(`quotePatterns: ${parsed.quotePatterns.map((item) => String(item).trim()).filter(Boolean).join(", ")}`);
      }
      const joined = cleanResearchInput(parts.join("\n"), 7000);
      if (joined) return joined;
    }
    return cleanResearchInput(text, 7000);
  }

  async function summarizeSupplementalResearchForCaption(character, context, supplementalResearch, guidance = "") {
    const source = cleanResearchInput(supplementalResearch, 10000);
    if (!source) return "";
    const lorebookEntries = Array.isArray(context?.lorebookEntries)
      ? context.lorebookEntries.slice(0, 16).map((entry) => trimCaptionLorebookEntry(entry, 600))
      : [];
    const messages = [
      {
        role: "system",
        content: [
          "You summarize research material for a Japanese RP TTS VoiceDesign caption.",
          "Extract only voice-relevant character information: gender/age impression, social register, speech style, tone, emotional range, pace, breath, distance, and memorable mannerisms.",
          "Use URLs, notes, character sheet, and lorebook as evidence, but ignore plot chronology, powers, trivia, spoilers, and relationship details unless they affect speaking style.",
          "If user guidance conflicts with research, preserve the user's requested voice direction while keeping the character recognizable.",
          "Do not mention copyrighted actors, celebrities, real people, or exact source quotes as voice references.",
          "Return only JSON in this exact shape: {\"voiceProfile\":\"...\",\"speechStyle\":\"...\",\"voiceCaptionHints\":\"...\",\"sampleLineHints\":\"...\"}.",
          "All values must be concise and useful for writing an Irodori VoiceDesign caption and one original Japanese sample line.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          userGuidance: guidance,
          character: context?.character || compactCharacterSheet(character),
          lorebookEntries,
          extractedResearch: source,
          note: "Create a voice-focused research digest. Return JSON only.",
        }, null, 2).slice(0, CAPTION_PROMPT_CHARS),
      },
    ];
    const responseText = await requestCaptionModel(messages, { allowPlugins: true, temperature: 0.2 });
    const digest = parseVoiceResearchDigest(responseText);
    addRuntimeLog("보이스 디자인 조사 자료 LLM 요약", {
      target: character?.name || getCharacterId(character),
      modelSource: config.captionModelSource,
      overrideModel: config.captionModel,
      sourceChars: source.length,
      digestChars: digest.length,
      digestPreview: digest.slice(0, 500),
      rawResponse: responseText,
    });
    return digest || source;
  }

  function trimCaptionLorebookEntry(entry, maxChars = CAPTION_LOREBOOK_ENTRY_CHARS) {
    if (typeof entry === "string") return entry.slice(0, maxChars);
    if (!entry || typeof entry !== "object") return entry;
    const next = { ...entry };
    for (const key of ["content", "text", "description", "comment", "entry", "value", "voiceHints"]) {
      if (typeof next[key] === "string") {
        next[key] = next[key].slice(0, maxChars);
      }
    }
    return next;
  }

  function buildVoiceDesignCaptionPrompt({ context, useCharacterLine, allowEmotionEmoji, userGuidance, supplementalResearch }) {
    const note = useCharacterLine
      ? "Create a caption suitable for Irodori VoiceDesign and one original Japanese test utterance in this character's voice. Return JSON only."
      : "Create a caption suitable for Irodori VoiceDesign. Put the neutral default test utterance in sampleText. Return JSON only.";
    let researchForPrompt = supplementalResearch;
    const makePriority = () => ({
      userGuidance,
      supplementalResearch: researchForPrompt,
      priorityRule: "Use userGuidance and supplementalResearch as the highest-priority voice/style material. If they conflict with lorebookEntries, prefer them for voice traits, speech style, and sampleText direction.",
    });
    const options = {
      writeCharacterSampleText: useCharacterLine,
      allowEmotionEmoji,
      targetSampleTextCharacters: normalizeVoiceReferenceSampleChars(config.voiceReferenceSampleChars),
    };
    const character = context.character;
    const sourceLorebookEntries = Array.isArray(context.lorebookEntries)
      ? context.lorebookEntries
      : [];
    let lorebookEntries = sourceLorebookEntries.map((entry) => trimCaptionLorebookEntry(entry));
    const stringify = (entries) => JSON.stringify({
      priority: makePriority(),
      options,
      character,
      lorebookEntries: entries,
      note,
    }, null, 2);
    let content = stringify(lorebookEntries);
    while (content.length > CAPTION_PROMPT_CHARS && lorebookEntries.length > CAPTION_MIN_LOREBOOK_ENTRIES) {
      const nextLength = Math.max(
        CAPTION_MIN_LOREBOOK_ENTRIES,
        lorebookEntries.length - Math.max(1, Math.ceil(lorebookEntries.length * 0.25)),
      );
      lorebookEntries = lorebookEntries.slice(0, nextLength);
      content = stringify(lorebookEntries);
    }
    if (content.length > CAPTION_PROMPT_CHARS) {
      lorebookEntries = sourceLorebookEntries
        .slice(0, CAPTION_MIN_LOREBOOK_ENTRIES)
        .map((entry) => trimCaptionLorebookEntry(entry, CAPTION_COMPACT_LOREBOOK_ENTRY_CHARS));
      content = stringify(lorebookEntries);
    }
    if (content.length > CAPTION_PROMPT_CHARS && researchForPrompt) {
      const overflow = content.length - CAPTION_PROMPT_CHARS;
      const nextResearchLength = Math.max(2400, researchForPrompt.length - overflow - 800);
      researchForPrompt = researchForPrompt.slice(0, nextResearchLength);
      content = stringify(lorebookEntries);
    }
    return {
      content: content.slice(0, CAPTION_PROMPT_CHARS),
      lorebookEntriesSent: lorebookEntries.length,
      promptChars: Math.min(content.length, CAPTION_PROMPT_CHARS),
      supplementalResearchSentChars: researchForPrompt.length,
    };
  }

  async function generateCaptionForCurrentCharacter(character, guidance = "") {
    const context = await buildVoiceDesignContext(character);
    const useCharacterLine = config.voiceDesignCharacterLine !== false;
    const allowEmotionEmoji = config.voiceDesignEmotionEmoji !== false;
    const targetSampleChars = normalizeVoiceReferenceSampleChars(config.voiceReferenceSampleChars);
    const userGuidance = cleanVoiceDesignGuidance(guidance || config.voiceDesignGuidance);
    const extractedResearch = await collectSupplementalResearchForCaption(character, userGuidance);
    let supplementalResearch = extractedResearch;
    let researchSummaryFailed = false;
    if (extractedResearch) {
      try {
        supplementalResearch = await summarizeSupplementalResearchForCaption(character, context, extractedResearch, userGuidance);
      } catch (error) {
        researchSummaryFailed = true;
        addRuntimeLog("보이스 디자인 조사 자료 LLM 요약 실패", {
          target: character?.name || getCharacterId(character),
          error: describeError(error),
          "후속 처리": "추출된 조사 자료를 그대로 사용합니다.",
        });
      }
    }
    const captionPrompt = buildVoiceDesignCaptionPrompt({
      context,
      useCharacterLine,
      allowEmotionEmoji,
      userGuidance,
      supplementalResearch,
    });
    const messages = [
      {
        role: "system",
        content: [
          "You write short Japanese VoiceDesign captions and test utterances for a TTS voice generator.",
          "Infer only voice traits from the character sheet and lorebook: gender presentation, age impression, personality, speaking style, emotional tone, pace, breathiness, clarity, and distance.",
          "Do not mention copyrighted actors, celebrities, real people, or exact character names as voice references.",
          "Also write a short original Japanese sampleText that this character might plausibly say in an RP scene. Do not copy existing source lines.",
          "Return only JSON in this exact shape: {\"caption\":\"...\",\"sampleText\":\"...\"}.",
          `caption must be natural Japanese only and describe the voice. sampleText must be natural Japanese dialogue, approximately ${targetSampleChars} Japanese characters. It may be about 20 percent shorter or longer, but avoid very short one-phrase samples unless the target is small.`,
          "If supplementalResearch is provided, treat it as high-priority evidence for voice, speech style, tone, and memorable mannerisms. Ignore plot spoilers, powers, trivia, biography details, and unrelated facts.",
          "If userGuidance or supplementalResearch clearly indicates a female or male voice source, preserve that gender presentation. Never flip it unless the user explicitly asks for the opposite.",
          allowEmotionEmoji
            ? "sampleText may include one fitting emotion emoji for Irodori emotion control, but only one and only if it improves the voice direction."
            : "Do not include emoji in sampleText.",
          "If userGuidance is provided, treat it as creative direction for the caption and sampleText, but keep the final caption and sampleText in natural Japanese.",
          "Do not include thoughts, analysis, markdown, XML tags, explanations, or English prose.",
        ].join(" "),
      },
      {
        role: "user",
        content: captionPrompt.content,
      },
    ];

    const MAX_CAPTION_RETRIES = 2;
    let responseText = "";
    let draft = null;
    for (let attempt = 0; attempt <= MAX_CAPTION_RETRIES; attempt++) {
      responseText = await requestCaptionModel(messages, { allowPlugins: true, temperature: 0.25 });
      draft = parseVoiceDesignDraft(responseText);
      if (isValidCaptionDraft(draft, useCharacterLine)) break;
      if (attempt < MAX_CAPTION_RETRIES) {
        addRuntimeLog("보이스 디자인 캡션 파싱 실패, 재시도", {
          target: character?.name || getCharacterId(character),
          attempt: attempt + 1,
          maxAttempts: MAX_CAPTION_RETRIES + 1,
          rawResponse: String(responseText || "").slice(0, 300),
          parsedCaption: String(draft?.caption || "").slice(0, 120),
          parsedSampleText: String(draft?.sampleText || "").slice(0, 120),
        });
        draft = null;
      }
    }
    const caption = draft?.caption || "";
    const sampleText = useCharacterLine
      ? (draft?.sampleText || "……少しだけ、話してもいい？")
      : PREVIEW_TEXT;
    if (!caption) {
      throw new Error(`Caption model returned empty/invalid result after ${MAX_CAPTION_RETRIES + 1} attempts. Last raw response: ${String(responseText || "").slice(0, 300)}`);
    }
    if (caption === "[object Object]") {
      throw new Error(`Caption model returned an object instead of text after ${MAX_CAPTION_RETRIES + 1} attempts. Last raw response: ${String(responseText || "").slice(0, 300)}`);
    }
    addRuntimeLog("보이스 디자인 캡션 생성", {
      target: character?.name || getCharacterId(character),
      modelSource: config.captionModelSource,
      overrideModel: config.captionModel,
      endpoint: config.captionEndpoint || "",
      guidance: userGuidance,
      caption,
      sampleText,
      targetSampleChars,
      lorebookEntries: context.lorebookEntries.length,
      lorebookEntriesSent: captionPrompt.lorebookEntriesSent,
      researchLlmSummary: Boolean(extractedResearch),
      researchLlmSummaryFailed: researchSummaryFailed,
      extractedResearchChars: extractedResearch.length,
      supplementalResearchChars: supplementalResearch.length,
      supplementalResearchSentChars: captionPrompt.supplementalResearchSentChars,
      supplementalResearchPreview: supplementalResearch.slice(0, 300),
      captionPromptChars: captionPrompt.promptChars,
      rawResponse: responseText,
    });
    return {
      caption,
      sampleText,
      context,
      modelSource: config.captionModelSource,
      guidance: userGuidance,
      supplementalResearch,
    };
  }

  function lorebookScanSystemPrompt() {
    return [
      String(config.lorebookScanPrompt || DEFAULT_LOREBOOK_SCAN_PROMPT).trim() || DEFAULT_LOREBOOK_SCAN_PROMPT,
      "Return only JSON in this exact shape: {\"characters\":[{\"name\":\"...\",\"aliases\":[\"...\"],\"description\":\"...\",\"voiceHints\":\"...\"}]}",
      `Return up to ${LOREBOOK_SCAN_MAX_CHARACTERS} characters if the lorebook contains that many valid recurring speakers.`,
    ].join("\n");
  }

  async function discoverLorebookCharactersForCurrentBot(character) {
    const context = await buildVoiceDesignContext(character);

    // Stage 1: discover candidate character names from entry titles only (lightweight)
    const candidateNames = await discoverCandidateCharacterNames(context);

    // Stage 2: filter lorebook entries to only those mentioning any candidate name
    let filteredEntries = context.lorebookEntries;
    if (candidateNames.length > 0) {
      const namesLower = candidateNames.map((n) => n.toLowerCase());
      filteredEntries = context.lorebookEntries.filter((entry) =>
        namesLower.some((name) => entry.toLowerCase().includes(name))
      );
    }

    // Fallback: if filtering removed too many, use all entries
    if (filteredEntries.length < 3) {
      filteredEntries = context.lorebookEntries;
    }

    // Stage 3: send filtered full entries in batches for detailed character data
    const allLlmCharacters = [];
    const entryBatches = chunkByJsonSize(filteredEntries, LOREBOOK_SCAN_BATCH_CHARS);
    for (const batch of entryBatches) {
      const messages = [
          {
            role: "system",
            content: lorebookScanSystemPrompt(),
          },
          {
            role: "user",
            content: JSON.stringify({
              currentCharacter: context.character,
              lorebookEntries: batch,
              note: "Find additional named RP characters from these lorebook entries. Return JSON only.",
            }, null, 2),
          },
      ];
      const responseText = await requestCaptionModel(messages, { allowPlugins: true, temperature: 0.2 });
      const batchCharacters = normalizeDiscoveredLorebookCharacters(responseText, character);
      allLlmCharacters.push(...batchCharacters);
    }

    const llmCharacters = mergeDiscoveredLorebookCharacters(allLlmCharacters, []);
    const fallbackCharacters = guessLorebookCharactersFromEntries(context.lorebookEntries, character);
    const initialCharacters = mergeDiscoveredLorebookCharacters(llmCharacters, fallbackCharacters)
      .filter((item) => hasLorebookSpeakerEvidence(item, context.lorebookEntries));
    const cleanup = await refineDiscoveredLorebookCharacterNames(initialCharacters, context, character);
    return {
      characters: cleanup.characters,
      context,
      modelSource: config.captionModelSource,
      promptHash: hashText(config.lorebookScanPrompt || DEFAULT_LOREBOOK_SCAN_PROMPT),
      rawResponse: "(batched)",
      llmCharacters,
      fallbackCharacters,
      cleanup,
    };
  }

  async function refineDiscoveredLorebookCharacterNames(characters, context, currentCharacter) {
    if (!characters.length) {
      return { characters, status: "skipped", rawResponse: "" };
    }

    try {
      const messages = [
          {
            role: "system",
            content: [
              "You clean and deduplicate a scanned RP character list for a RisuAI voice plugin.",
              "Return only JSON in this exact shape: {\"characters\":[{\"name\":\"...\",\"aliases\":[\"...\"],\"description\":\"...\",\"voiceHints\":\"...\"}]}",
              "Merge entries that refer to the same character, including romanized English, Hangul, kana, and kanji variants.",
              "When both Hangul and kanji/kana names are available for one character, set name to Hangul(kanji/kana), for example 탄지로(炭治郎).",
              "Prefer Korean Hangul display names when they appear in the lorebook or are obvious from aliases. Otherwise prefer kana/kanji names. Use romanized English only when no CJK display name is available.",
              "Put alternate spellings, romanized names, kanji names, kana names, Hangul names, and previous display names in aliases.",
              "Aliases are live RP speaker labels. Keep short obvious variants such as Makima, 마키마, マキマ together when they refer to the same character.",
              "Remove the current main bot title and remove profile field labels or section headings.",
              "Do not invent extra characters that are not present in the input list.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              currentCharacter: context.character,
              scannedCharacters: characters,
              note: "Clean names, merge duplicates, and prefer Korean/CJK display names over romanized English. Return JSON only.",
            }, null, 2),
          },
      ];
      const responseText = await requestCaptionModel(messages, { allowPlugins: true, temperature: 0.15 });
      const refined = normalizeDiscoveredLorebookCharacters(responseText, currentCharacter);
      const merged = mergeDiscoveredLorebookCharacters(refined, []);
      if (merged.length >= Math.max(1, Math.floor(characters.length * 0.45))) {
        return { characters: merged, status: "cleaned", rawResponse: responseText };
      }
      return { characters, status: "kept-original-low-count", rawResponse: responseText };
    } catch (error) {
      return {
        characters,
        status: `failed: ${describeError(error)}`,
        rawResponse: "",
      };
    }
  }

  function lorebookCleanupStatusLabel(status) {
    const text = String(status || "").trim();
    if (!text || text === "skipped") return "건너뜀";
    if (text === "cleaned") return "정리 완료";
    if (text === "kept-original-low-count") return "기존 이름 유지";
    if (text.startsWith("failed:")) {
      const reason = text.slice("failed:".length).trim();
      return `정리 실패${reason ? `: ${reason}` : ""}`;
    }
    return text;
  }

  /**
   * Split array into batches by JSON.stringify size.
   */
  function chunkByJsonSize(arr, maxChars) {
    if (!arr.length) return [];
    const sizes = arr.map((item) => JSON.stringify(item).length + 1);
    const chunks = [];
    let start = 0;
    let sum = 2;
    for (let i = 0; i < arr.length; i++) {
      if (sum + sizes[i] > maxChars && i > start) {
        chunks.push(arr.slice(start, i));
        start = i;
        sum = 2 + sizes[i];
      } else {
        sum += sizes[i];
      }
    }
    if (start < arr.length) chunks.push(arr.slice(start));
    return chunks;
  }

  /**
   * Extract entry "title" (name + keys) for lightweight Stage 1 scan.
   */
  function extractLorebookEntryTitle(entry) {
    const text = String(entry || "");
    const nameMatch = text.match(/(?:^|\|)\s*name:\s*([^|]+?)\s*(?:\||$)/);
    const keysMatch = text.match(/(?:^|\|)\s*keys?:\s*([^|]+?)\s*(?:\||$)/);
    const name = nameMatch ? nameMatch[1].trim() : "";
    const keys = keysMatch ? keysMatch[1].trim() : "";
    if (name) return keys ? `${name} (${keys})` : name;
    return text.slice(0, 120).trim();
  }

  /**
   * Stage 1: send only lorebook entry titles to LLM -> discover candidate character names as JSON array.
   */
  async function discoverCandidateCharacterNames(context) {
    const titleEntries = context.lorebookEntries.map(extractLorebookEntryTitle).filter(Boolean);
    if (!titleEntries.length) return [];
    const allNames = [];
    const batches = chunkByJsonSize(titleEntries, LOREBOOK_SCAN_BATCH_CHARS);
    for (const batch of batches) {
      const messages = [
        {
          role: "system",
          content: "You are a lorebook analyzer. Extract all distinct named RP characters from the lorebook entry identifiers below.\n"
            + "Focus on character names (not locations, items, factions).\n"
            + "Return ONLY a valid JSON array of strings, e.g. [\"Alice\", \"Bob\"]. No markdown, no extra text.",
        },
        {
          role: "user",
          content: JSON.stringify({ lorebookEntryIdentifiers: batch }),
        },
      ];
      const responseText = await requestCaptionModel(messages, { allowPlugins: true, temperature: 0.1 }).catch(() => "");
      try {
        const trimmed = responseText.trim();
        const arrMatch = trimmed.match(/\[[\s\S]*?\]/);
        if (arrMatch) {
          const parsed = JSON.parse(arrMatch[0]);
          if (Array.isArray(parsed)) {
            for (const n of parsed) {
              const name = String(n).trim();
              if (name) allNames.push(name);
            }
          }
        }
      } catch (e) {}
    }
    return [...new Set(allNames)];
  }

  async function buildVoiceDesignContext(character) {
    const isGlobalVoice = isGlobalVoiceCharacter(character);
    const contextCharacter = characterWithoutParentCharacter(character);
    const db = typeof api.getDatabase === "function"
      ? await api.getDatabase(["characters", "modules", "enabledModules"]).catch(() => null)
      : null;
    const characterId = getCharacterId(contextCharacter);
    const characterName = contextCharacter?.name || "";
    const lorebookEntries = [];

    lorebookEntries.push(...extractLorebookEntries(contextCharacter, "current-character"));
    if (!isGlobalVoice && character?.parentCharacter) {
      lorebookEntries.push(...extractLorebookEntries(character.parentCharacter, "parent-character"));
    }
    if (Array.isArray(character?.lorebookHints)) {
      for (const hint of character.lorebookHints) {
        if (String(hint || "").trim()) {
          lorebookEntries.push(`focused-lorebook-character: ${String(hint).trim()}`);
        }
      }
    }

    if (!isGlobalVoice && db?.characters) {
      const matched = db.characters.find((item) => {
        const id = getCharacterId(item);
        return id === characterId || (characterName && item?.name === characterName);
      });
      if (matched && matched !== character) {
        lorebookEntries.push(...extractLorebookEntries(matched, "database-character"));
      }
    }

    if (!isGlobalVoice && db?.modules) {
      const enabled = Array.isArray(db.enabledModules) ? new Set(db.enabledModules.map(String)) : null;
      for (const module of db.modules) {
        if (enabled && module?.id && !enabled.has(String(module.id))) continue;
        if (!module?.lorebook) continue;
        lorebookEntries.push(...extractLorebookEntries(module.lorebook, `module:${module.name || module.id || "lorebook"}`));
      }
    }

    return {
      character: compactCharacterSheet(contextCharacter),
      lorebookEntries: dedupeText(lorebookEntries).slice(0, LOREBOOK_SCAN_MAX_ENTRIES),
      databaseAccess: isGlobalVoice ? "global" : db ? "granted" : "unavailable",
    };
  }

  function isGlobalVoiceCharacter(character) {
    const id = getCharacterId(character);
    return id === GLOBAL_BOT_ID || isDefaultGlobalVoiceCharacterId(id);
  }

  function characterWithoutParentCharacter(character) {
    if (!character || typeof character !== "object") return character;
    const clone = { ...character };
    delete clone.parentCharacter;
    return clone;
  }

  function extractLorebookEntries(value, label) {
    const output = [];
    const seen = new Set();
    walkLoreValue(value, label, "root", output, seen, 0);
    return output.map((entry) => entry.slice(0, LOREBOOK_SCAN_ENTRY_CHARS)).filter(Boolean);
  }

  function walkLoreValue(value, label, path, output, seen, depth) {
    if (output.length >= LOREBOOK_SCAN_MAX_WALK_ENTRIES || depth > 5 || value == null) return;
    if (typeof value === "string") {
      if (isLorePath(path) && value.trim().length > 10) {
        output.push(`${label}/${path}: ${value.trim()}`);
      }
      return;
    }
    if (typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      value.slice(0, LOREBOOK_SCAN_MAX_ARRAY_ITEMS).forEach((item, index) => {
        walkLoreValue(item, label, `${path}[${index}]`, output, seen, depth + 1);
      });
      return;
    }

    const summary = summarizeLoreObject(value);
    if (summary && (isLorePath(path) || hasLoreShape(value))) {
      output.push(`${label}/${path}: ${summary}`);
    }

    for (const [key, child] of Object.entries(value)) {
      if (isLorePath(key) || isLorePath(path) || hasLoreShape(child)) {
        walkLoreValue(child, label, `${path}.${key}`, output, seen, depth + 1);
      }
    }
  }

  function isLorePath(value) {
    return /(lore|world|book|memory|entry|entries|scenario|persona|description|personality)/i.test(String(value || ""));
  }

  function hasLoreShape(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const keys = Object.keys(value).map((key) => key.toLowerCase());
    return keys.some((key) => /(key|keys|content|prompt|memo|comment|insert|entry|name)/.test(key))
      && keys.some((key) => /(content|prompt|text|memo|comment|description|desc|name)/.test(key));
  }

  function summarizeLoreObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    const parts = [];
    const fields = [
      ["name", "name"],
      ["key", "keys"],
      ["keys", "keys"],
      ["activationKeys", "keys"],
      ["content", "content"],
      ["prompt", "prompt"],
      ["text", "text"],
      ["memo", "memo"],
      ["comment", "comment"],
      ["description", "description"],
      ["desc", "description"],
      ["insert", "insert"],
    ];
    for (const [fieldName, label] of fields) {
      const raw = value[fieldName];
      if (raw == null) continue;
      const text = Array.isArray(raw) ? raw.join(", ") : String(raw);
      if (text.trim()) parts.push(`${label}: ${text.trim()}`);
    }
    return parts.join(" | ");
  }

  function dedupeText(items) {
    const seen = new Set();
    const result = [];
    for (const item of items) {
      const text = String(item || "").trim();
      const key = text.toLowerCase();
      if (!text || seen.has(key)) continue;
      seen.add(key);
      result.push(text);
    }
    return result;
  }

  function cleanCaption(value) {
    const text = extractCaptionText(value);
    let cleaned = String(text || "")
      .replace(/^```(?:\w+)?/i, "")
      .replace(/```$/i, "")
      .replace(/<\s*(?:thoughts?|thinking|analysis|reasoning)\s*>[\s\S]*?<\s*\/\s*(?:thoughts?|thinking|analysis|reasoning)\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\*\*(?:[^*]+)\*\*/g, " ")
      .replace(/^\s*(?:caption|voice\s*caption|音声|声|voice)\s*[:：]\s*/i, "")
      .replace(/^\s*\{\s*["']?(?:caption|voiceCaption|voice_design_caption)["']?\s*[:：]\s*["']?/i, "")
      .replace(/^\s*["'`「『]+|["'`」』]+\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    cleaned = preferJapaneseCaption(cleaned);
    cleaned = stripJsonTail(cleaned);
    return cleaned
      .replace(/^\s*(?:caption|voice\s*caption|音声|声|voice)\s*[:：]\s*/i, "")
      .replace(/^\s*\{\s*["']?(?:caption|voiceCaption|voice_design_caption)["']?\s*[:：]\s*["']?/i, "")
      .replace(/["'`]*\s*\}\s*$/g, "")
      .replace(/^\s*["'`「『]+|["'`」』]+\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseVoiceDesignDraft(value) {
    const text = typeof value === "string" ? value.trim() : responseObjectToJsonText(value);
    const parsed = tryParseJsonObject(text);
    if (parsed) {
      return {
        caption: cleanCaption(parsed.caption || parsed.voiceCaption || parsed.voice_design_caption || ""),
        sampleText: cleanVoiceDesignSampleText(parsed.sampleText || parsed.sample_text || parsed.text || parsed.line || parsed.dialogue || ""),
      };
    }

    return {
      caption: cleanCaption(
        extractJsonishField(text, "caption")
        || extractJsonishField(text, "voiceCaption")
        || extractJsonishField(text, "voice_design_caption")
        || text
      ),
      sampleText: cleanVoiceDesignSampleText(extractJsonishField(text, "sampleText") || extractJsonishField(text, "sample_text")),
    };
  }

  function isValidCaptionDraft(draft, useCharacterLine) {
    const caption = String(draft?.caption || "").trim();
    if (!caption) return false;
    if (caption === "[object Object]") return false;
    if (/^\{[\s\S]*\}$/.test(caption)) return false;
    if (/["']?\s*(?:sampleText|sample_text)\s*["']?\s*[:：]/i.test(caption)) return false;
    if (/^[.．。…\s]{1,12}$/.test(caption)) return false;
    if (caption.length < 8) return false;
    if (useCharacterLine) {
      const sample = String(draft?.sampleText || "").trim();
      if (!sample) return false;
      if (/^[.．。…\s]{1,12}$/.test(sample)) return false;
      if (/^\{[\s\S]*\}$/.test(sample)) return false;
    }
    return true;
  }

  function responseObjectToJsonText(value) {
    if (value && typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return extractTextFromUnknown(value);
      }
    }
    return String(value || "");
  }

  function tryParseJsonObject(value) {
    const parsed = tryParseJsonValue(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  }

  function tryParseJsonValue(value) {
    let text = String(value || "").trim();
    if (!text) return null;
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const objectFirst = text.indexOf("{");
    const objectLast = text.lastIndexOf("}");
    const arrayFirst = text.indexOf("[");
    const arrayLast = text.lastIndexOf("]");
    if (arrayFirst >= 0 && arrayLast > arrayFirst && (objectFirst < 0 || arrayFirst < objectFirst)) {
      text = text.slice(arrayFirst, arrayLast + 1);
    } else if (objectFirst >= 0 && objectLast > objectFirst) {
      text = text.slice(objectFirst, objectLast + 1);
    }
    try {
      return JSON.parse(text);
    } catch {
      try {
        const repaired = repairJsonControlChars(text);
        if (repaired && repaired !== text) return JSON.parse(repaired);
      } catch {}
      return null;
    }
  }

  function repairJsonControlChars(text) {
    let result = "";
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) {
          result += ch;
          escaped = false;
        } else if (ch === "\\") {
          result += ch;
          escaped = true;
        } else if (ch === '"') {
          result += ch;
          inString = false;
        } else if (ch < " ") {
          const code = ch.charCodeAt(0);
          if (code === 10) result += "\\n";
          else if (code === 13) result += "\\r";
          else if (code === 9) result += "\\t";
          else result += "\\u" + code.toString(16).padStart(4, "0");
        } else {
          result += ch;
        }
      } else {
        if (ch === '"') inString = true;
        result += ch;
      }
    }
    return result;
  }

  function extractJsonishField(value, fieldName) {
    const text = String(value || "");
    const escaped = String(fieldName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const quotedRe = new RegExp(`["']${escaped}["']\\s*[:：]\\s*["']((?:[^"\\\\]|\\\\.)*?)["'](?=\\s*(?:,|\\}|\\]|$))`, "i");
    let match = text.match(quotedRe);
    if (match?.[1] && match[1].trim()) return match[1].trim();
    const fallbackRe = new RegExp(`["']?${escaped}["']?\\s*[:：]\\s*["']?([\\s\\S]*?)(?:["']?\\s*,\\s*["']?\\w+["']?\\s*[:：]|["']?\\s*}\\s*$|$)`, "i");
    match = text.match(fallbackRe);
    return match?.[1] ? match[1].trim() : "";
  }

  function cleanVoiceDesignSampleText(value) {
    let text = String(value || "")
      .replace(/^```(?:\w+)?/i, "")
      .replace(/```$/i, "")
      .replace(/<\s*(?:thoughts?|thinking|analysis|reasoning)\s*>[\s\S]*?<\s*\/\s*(?:thoughts?|thinking|analysis|reasoning)\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/^\s*(?:sampleText|sample_text|text|line|dialogue|대사|台詞)\s*[:：]\s*/i, "")
      .replace(/^\s*["'`「『]+|["'`」』]+\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    text = stripJsonTail(text)
      .replace(/["'`]*\s*\}\s*$/g, "")
      .replace(/^\s*["'`「『]+|["'`」』]+\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 140) {
      text = text.slice(0, 140).trim();
    }
    return text;
  }

  function hasLocalizedLoreName(value) {
    return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7a3]/.test(String(value || ""));
  }

  function hasHangulName(value) {
    return /[\uac00-\ud7a3]/.test(String(value || ""));
  }

  function hasJapaneseName(value) {
    return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(value || ""));
  }

  function normalizeRomanizedName(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function romanizeHangulText(value) {
    const initials = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
    const vowels = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
    const finals = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
    let out = "";
    for (const char of String(value || "")) {
      const code = char.charCodeAt(0);
      if (code >= 0xac00 && code <= 0xd7a3) {
        const offset = code - 0xac00;
        const initial = Math.floor(offset / 588);
        const vowel = Math.floor((offset % 588) / 28);
        const final = offset % 28;
        out += `${initials[initial]}${vowels[vowel]}${finals[final]}`;
      } else {
        out += char;
      }
    }
    return normalizeRomanizedName(out);
  }

  function romanizeKatakanaText(value) {
    const digraphs = new Map(Object.entries({
      キャ: "kya", キュ: "kyu", キョ: "kyo", シャ: "sha", シュ: "shu", ショ: "sho", チャ: "cha", チュ: "chu", チョ: "cho",
      ニャ: "nya", ニュ: "nyu", ニョ: "nyo", ヒャ: "hya", ヒュ: "hyu", ヒョ: "hyo", ミャ: "mya", ミュ: "myu", ミョ: "myo",
      リャ: "rya", リュ: "ryu", リョ: "ryo", ギャ: "gya", ギュ: "gyu", ギョ: "gyo", ジャ: "ja", ジュ: "ju", ジョ: "jo",
      ビャ: "bya", ビュ: "byu", ビョ: "byo", ピャ: "pya", ピュ: "pyu", ピョ: "pyo", ファ: "fa", フィ: "fi", フェ: "fe", フォ: "fo",
      ティ: "ti", ディ: "di", シェ: "she", ジェ: "je", チェ: "che",
    }));
    const kana = new Map(Object.entries({
      ア: "a", イ: "i", ウ: "u", エ: "e", オ: "o", カ: "ka", キ: "ki", ク: "ku", ケ: "ke", コ: "ko",
      サ: "sa", シ: "shi", ス: "su", セ: "se", ソ: "so", タ: "ta", チ: "chi", ツ: "tsu", テ: "te", ト: "to",
      ナ: "na", ニ: "ni", ヌ: "nu", ネ: "ne", ノ: "no", ハ: "ha", ヒ: "hi", フ: "fu", ヘ: "he", ホ: "ho",
      マ: "ma", ミ: "mi", ム: "mu", メ: "me", モ: "mo", ヤ: "ya", ユ: "yu", ヨ: "yo", ラ: "ra", リ: "ri", ル: "ru", レ: "re", ロ: "ro",
      ワ: "wa", ヲ: "o", ン: "n", ガ: "ga", ギ: "gi", グ: "gu", ゲ: "ge", ゴ: "go", ザ: "za", ジ: "ji", ズ: "zu", ゼ: "ze", ゾ: "zo",
      ダ: "da", ヂ: "ji", ヅ: "zu", デ: "de", ド: "do", バ: "ba", ビ: "bi", ブ: "bu", ベ: "be", ボ: "bo",
      パ: "pa", ピ: "pi", プ: "pu", ペ: "pe", ポ: "po", ヴ: "vu",
    }));
    let out = "";
    let doubleNext = false;
    const text = String(value || "")
      .normalize("NFKC")
      .replace(/[\u3041-\u3096]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
    for (let i = 0; i < text.length; i += 1) {
      const two = text.slice(i, i + 2);
      let rom = "";
      if (digraphs.has(two)) {
        rom = digraphs.get(two);
        i += 1;
      } else {
        const char = text[i];
        if (char === "ッ") {
          doubleNext = true;
          continue;
        }
        if (char === "ー") {
          const vowel = out.match(/[aeiou]$/)?.[0] || "";
          out += vowel;
          continue;
        }
        rom = kana.get(char) || char;
      }
      if (doubleNext && /^[bcdfghjklmnpqrstvwxyz]/.test(rom)) {
        out += rom[0];
      }
      out += rom;
      doubleNext = false;
    }
    return normalizeRomanizedName(out);
  }

  function expandRomanizedVariants(value) {
    const base = normalizeRomanizedName(value);
    if (!base) return [];
    const variants = new Set([base]);
    variants.add(base.replace(/si/g, "shi"));
    variants.add(base.replace(/sya/g, "sha").replace(/syu/g, "shu").replace(/syo/g, "sho"));
    variants.add(base.replace(/je/g, "ze"));
    variants.add(base.replace(/reje/g, "reze"));
    return [...variants].filter(Boolean);
  }

  function hasLatinLetters(value) {
    return /[A-Za-z]/.test(String(value || ""));
  }

  function isGenericLoreAliasKey(value) {
    const clean = normalizeLoreCandidateName(value);
    if (!clean) return true;
    const lower = clean.toLowerCase();
    const roman = normalizeRomanizedName(clean);
    const fieldKey = lower
      .replace(/[_-]+/g, " ")
      .replace(/[^a-z0-9가-힣ぁ-んァ-ヶ一-龯]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return GENERIC_LORE_ALIAS_KEYS.has(lower)
      || GENERIC_LORE_ALIAS_KEYS.has(roman)
      || GENERIC_LORE_ALIAS_KEYS.has(fieldKey);
  }

  function isKoreanGenericTitleName(value) {
    const clean = normalizeLoreCandidateName(value);
    if (!hasHangulName(clean)) return false;
    return /(?:의|악마|마인|마녀|괴물|괴인|귀신|요괴|정령|천사|신|왕|여왕|공주|왕자|기사|용사|나레이터|지문|해설|화자)/.test(clean);
  }

  function isAutoRomanizedFromKoreanGenericTitle(value, allNames = []) {
    const roman = normalizeRomanizedName(value);
    if (!roman) return false;
    return (allNames || []).some((name) => {
      const clean = normalizeLoreCandidateName(name);
      if (!isKoreanGenericTitleName(clean)) return false;
      return roman === romanizeHangulText(clean);
    });
  }

  function filterLoreMatchBaseNames(name, aliases = []) {
    const baseNames = mergeAliases([], [
      name,
      ...(Array.isArray(aliases) ? aliases : []),
      ...splitLoreDisplayNameParts(name),
      ...(Array.isArray(aliases) ? aliases.flatMap((alias) => splitLoreDisplayNameParts(alias)) : []),
    ]);
    return baseNames.filter((value) => {
      if (isBadLoreMatchKey(value, "")) return false;
      return !isAutoRomanizedFromKoreanGenericTitle(value, baseNames);
    });
  }

  function normalizeLoreAliasCandidate(value) {
    let clean = normalizeLoreCandidateName(value);
    const parenMatch = clean.match(/^(.+?)\s*[\(（]\s*([^)）]+)\s*[\)）]\s*$/);
    if (parenMatch && isGenericLoreAliasKey(parenMatch[2])) {
      clean = normalizeLoreCandidateName(parenMatch[1]);
    }
    return clean;
  }

  function isBadLoreMatchKey(value, currentName = "") {
    const clean = normalizeLoreCandidateName(value);
    if (isBadLoreCandidateName(clean, currentName)) return true;
    const lower = clean.toLowerCase();
    const roman = normalizeRomanizedName(clean);
    if (isGenericLoreAliasKey(clean)) return true;
    if (!hasLocalizedLoreName(clean) && /\b(?:kid|adult|child|teen|teenager|young|old|younger|older|male|female|boy|girl|man|woman)\b/i.test(roman)) return true;
    if (BLOCKED_LORE_CHARACTER_NAMES.has(lower) || BLOCKED_LORE_CHARACTER_NAMES.has(roman)) return true;
    return false;
  }

  function shouldAutoRomanizeName(value, allNames = []) {
    const clean = normalizeLoreCandidateName(value);
    if (!clean || /[\(（]/.test(clean) || hasLatinLetters(clean)) return false;
    if (isKoreanGenericTitleName(clean)) return false;
    const hasExplicitLatin = (allNames || []).some((item) => hasLatinLetters(item));
    if (hasExplicitLatin && (hasHangulName(clean) || hasJapaneseName(clean))) return false;
    return true;
  }

  function expandNameMatchVariants(value, options = {}) {
    const clean = normalizeLoreCandidateName(value);
    if (!clean) return [];
    const variants = [clean];
    const latin = normalizeRomanizedName(clean);
    if (latin && hasLatinLetters(clean)) variants.push(...expandRomanizedVariants(latin));
    if (options.allowAutoRomanize !== false && shouldAutoRomanizeName(clean, options.allNames || [])) {
      const hangul = romanizeHangulText(clean);
      if (hangul) variants.push(...expandRomanizedVariants(hangul));
      const katakana = romanizeKatakanaText(clean);
      if (katakana && katakana !== hangul) variants.push(...expandRomanizedVariants(katakana));
    }
    return normalizeLoreMatchKeys(variants)
      .filter((key) => !isBadLoreMatchKey(key, options.currentName || ""));
  }

  function defaultMatchKeysForCharacter(name, aliases = []) {
    const baseNames = filterLoreMatchBaseNames(name, aliases);
    const expanded = [];
    for (const value of baseNames) {
      if (!isBadLoreMatchKey(value, "")) expanded.push(value);
      for (const variant of expandNameMatchVariants(value, { allNames: baseNames, currentName: "" })) {
        if (variant && variant !== normalizeLoreCandidateName(value).toLowerCase()) {
          expanded.push(variant);
        }
      }
    }
    return mergeAliases([], expanded);
  }

  function parseMatchKeyInput(value, characterName = "") {
    const nameKey = normalizeLoreCandidateName(characterName).toLowerCase();
    return mergeAliases([], String(value || "")
      .split(/[,、\n\r]+/)
      .map((item) => normalizeLoreAliasCandidate(item))
      .filter((item) => item && !isBadLoreMatchKey(item, nameKey)));
  }

  function matchKeyInputValue(referenceSet, fallbackName = "") {
    const profile = referenceSet?.characterProfile || {};
    const name = referenceSet?.characterName || profile.name || fallbackName;
    return defaultMatchKeysForCharacter(name, profile.aliases || []).join(", ");
  }

  function splitLoreDisplayNameParts(value) {
    const text = normalizeLoreCandidateName(value);
    if (!text) return [];
    const parts = [text];
    const parenPattern = /(.+?)\s*[\(（]\s*([^)）]+)\s*[\)）]\s*$/;
    const match = text.match(parenPattern);
    if (match) {
      parts.push(match[1], match[2]);
    }
    return mergeAliases([], parts);
  }

  function splitLoreNameTokens(value) {
    return String(value || "")
      .split(/[\s　·・,、/]+/)
      .map((part) => normalizeLoreCandidateName(part))
      .filter((part) => part.length >= 2 && !isBadLoreMatchKey(part, ""));
  }

  function normalizeLoreMatchKeys(values) {
    const result = [];
    const seen = new Set();
    for (const value of values || []) {
      const key = normalizeLoreCandidateName(value).toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(key);
    }
    return result;
  }

  function composeLoreDisplayName(preferredName, aliases) {
    const names = mergeAliases([], [
      preferredName,
      ...(Array.isArray(aliases) ? aliases : []),
    ]).flatMap((name) => splitLoreDisplayNameParts(name));
    const cleanNames = mergeAliases([], names);
    const hangul = cleanNames.find((name) => hasHangulName(name) && !/[()（）]/.test(name));
    const japanese = cleanNames.find((name) => hasJapaneseName(name) && !hasHangulName(name) && !/[()（）]/.test(name));
    if (hangul && japanese && hangul !== japanese) {
      return {
        name: `${hangul}(${japanese})`,
        aliases: mergeAliases([], [preferredName, ...cleanNames, hangul, japanese]),
      };
    }
    return {
      name: preferredName,
      aliases: mergeAliases([], cleanNames.filter((name) => name !== preferredName)),
    };
  }

  function canonicalizeLoreCharacterName(name, aliases, currentName = "") {
    const cleanName = normalizeLoreCandidateName(name);
    const cleanAliases = (Array.isArray(aliases) ? aliases : [])
      .map((alias) => normalizeLoreCandidateName(alias))
      .filter((alias) => alias && !isBadLoreCandidateName(alias, currentName));
    const localized = hasLocalizedLoreName(cleanName)
      ? ""
      : cleanAliases.find((alias) => hasLocalizedLoreName(alias));
    if (!localized) {
      return composeLoreDisplayName(cleanName, cleanAliases);
    }
    return composeLoreDisplayName(localized, [
      cleanName,
      ...cleanAliases.filter((alias) => alias !== localized),
    ]);
  }

  function loreNameMatchKeys(name, aliases) {
    const baseNames = filterLoreMatchBaseNames(name, aliases);
    return normalizeLoreMatchKeys(baseNames.flatMap((value) => expandNameMatchVariants(value, { allNames: baseNames, currentName: "" })));
  }

  function loreSpeakerMatchKeys(name, aliases) {
    const full = loreNameMatchKeys(name, aliases);
    const baseNames = filterLoreMatchBaseNames(name, aliases);
    const tokens = normalizeLoreMatchKeys(baseNames.flatMap((value) => splitLoreNameTokens(value).flatMap((token) => expandNameMatchVariants(token, { allNames: baseNames, currentName: "" }))))
      .filter((value) => !full.includes(value));
    return { full, tokens };
  }

  function normalizeDiscoveredLorebookCharacters(value, currentCharacter) {
    const rawCharacters = findDiscoveredCharacterArray(value);

    const currentName = String(currentCharacter?.name || getCharacterId(currentCharacter) || "").trim().toLowerCase();
    const seen = new Set();
    return rawCharacters.map((item) => {
      const source = item && typeof item === "object" ? item : { name: item };
      const name = normalizeLoreCandidateName(source.name || source.characterName || source.displayName || "");
      if (!name) return null;
      const aliases = Array.isArray(source.aliases)
        ? source.aliases.map((alias) => normalizeLoreAliasCandidate(alias)).filter((alias) => !isBadLoreMatchKey(alias, currentName))
        : String(source.aliases || "").split(/[,、/]/).map((alias) => normalizeLoreAliasCandidate(alias)).filter((alias) => !isBadLoreMatchKey(alias, currentName));
      const canonical = canonicalizeLoreCharacterName(name, aliases, currentName);
      const keys = loreNameMatchKeys(canonical.name, canonical.aliases);
      if (!keys.length || isBadLoreCandidateName(canonical.name, currentName) || keys.some((key) => seen.has(key))) return null;
      keys.forEach((key) => seen.add(key));
      return {
        name: canonical.name,
        aliases: canonical.aliases,
        description: String(source.description || source.profile || source.summary || "").trim(),
        voiceHints: String(source.voiceHints || source.voice || source.speakingStyle || source.tone || "").trim(),
      };
    }).filter(Boolean).slice(0, LOREBOOK_SCAN_MAX_CHARACTERS);
  }

  function findDiscoveredCharacterArray(value, depth = 0) {
    if (depth > 6 || value == null) return [];
    if (typeof value === "string") {
      const parsed = tryParseJsonValue(value);
      return parsed ? findDiscoveredCharacterArray(parsed, depth + 1) : [];
    }
    if (Array.isArray(value)) {
      return arrayLooksLikeCharacterList(value) ? value : [];
    }
    if (typeof value !== "object") return [];

    for (const key of ["characters", "items", "results"]) {
      if (Array.isArray(value[key]) && arrayLooksLikeCharacterList(value[key])) {
        return value[key];
      }
    }

    for (const key of ["content", "message", "text", "response", "result", "output", "data", "value", "answer"]) {
      const found = findDiscoveredCharacterArray(value[key], depth + 1);
      if (found.length) return found;
    }

    for (const child of Object.values(value)) {
      const found = findDiscoveredCharacterArray(child, depth + 1);
      if (found.length) return found;
    }
    return [];
  }

  function arrayLooksLikeCharacterList(items) {
    if (!Array.isArray(items) || !items.length) return false;
    return items.some((item) => {
      if (typeof item === "string") return item.trim().length >= 2;
      if (!item || typeof item !== "object") return false;
      return Boolean(item.name || item.characterName || item.displayName);
    });
  }

  function mergeDiscoveredLorebookCharacters(primary, fallback) {
    const merged = [];
    const seen = new Set();
    for (const item of [...(primary || []), ...(fallback || [])]) {
      const name = normalizeLoreCandidateName(item?.name || "");
      if (!name || isBadLoreCandidateName(name, "")) continue;
      const aliases = Array.isArray(item.aliases)
        ? item.aliases.map((alias) => normalizeLoreAliasCandidate(alias)).filter((alias) => !isBadLoreMatchKey(alias, ""))
        : [];
      const canonical = canonicalizeLoreCharacterName(name, aliases, "");
      const keys = loreNameMatchKeys(canonical.name, canonical.aliases);
      if (keys.some((key) => seen.has(key))) continue;
      keys.forEach((key) => seen.add(key));
      merged.push({
        name: canonical.name,
        aliases: canonical.aliases,
        description: String(item.description || "").trim(),
        voiceHints: String(item.voiceHints || "").trim(),
      });
    }
    return merged.slice(0, LOREBOOK_SCAN_MAX_CHARACTERS);
  }

  function hasLorebookSpeakerEvidence(item, entries) {
    const name = normalizeLoreCandidateName(item?.name || "");
    if (!name) return false;
    if (isBadLoreCandidateName(name, "")) return false;
    const profileText = `${item?.description || ""} ${item?.voiceHints || ""}`;
    if (hasSpeakerProfileTerms(profileText) && profileText.trim().length >= 12) return true;

    const aliases = Array.isArray(item?.aliases) ? item.aliases : [];
    const names = loreNameMatchKeys(name, aliases);
    return (entries || []).some((entry) => {
      const text = String(entry || "");
      if (!names.some((candidate) => text.includes(candidate))) return false;
      return isLikelyLorebookSpeakerEntry(text, name);
    });
  }

  function hasSpeakerProfileTerms(value) {
    return /(voice|tone|speech|speaking|dialogue|personality|profile|appearance|age|gender|role|npc|speaker|목소리|음성|말투|대사|성격|외형|나이|연령|성별|역할|인물|프로필|口調|声|性格|年齢|性別|人物|話し方|喋り方|女性|男性|少女|少年)/i.test(String(value || ""));
  }

  function isLikelyLorebookSpeakerEntry(entryText, name) {
    const text = String(entryText || "");
    if (text.trim().length < 80) return false;
    if (hasSpeakerProfileTerms(text)) return true;
    const nameText = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!nameText) return false;
    const nameCount = (text.match(new RegExp(nameText, "g")) || []).length;
    const hasProfileField = /(?:content|prompt|description|desc|memo|comment|profile|프로필|설명|내용|設定|プロフィール)\s*[:：]/i.test(text);
    return nameCount >= 2 && hasProfileField && text.length >= 220;
  }

  function guessLorebookCharactersFromEntries(entries, currentCharacter) {
    const currentName = normalizeLoreCandidateName(currentCharacter?.name || getCharacterId(currentCharacter)).toLowerCase();
    const guesses = new Map();
    for (const entry of entries || []) {
      const text = String(entry || "");
      if (!text.trim()) continue;

      collectLoreNameFields(text).forEach((candidate) => {
        addLoreCharacterGuess(guesses, candidate.name, candidate.aliases, text, currentName);
      });
    }
    return Array.from(guesses.values()).slice(0, LOREBOOK_SCAN_MAX_CHARACTERS);
  }

  function collectLoreNameFields(text) {
    const candidates = [];
    const explicitPattern = /(?:^|[|:：\n\r])\s*(?:name|characterName|displayName|character|char|speaker|이름|캐릭터|캐릭터명|인물|名前|キャラクター|人物)\s*[:：]\s*([^|\n\r,;，。]{2,50})/gi;
    let match = null;
    while ((match = explicitPattern.exec(text))) {
      candidates.push({ name: match[1], aliases: [] });
    }

    const keyPattern = /(?:^|[|:：\n\r])\s*(?:key|keys|activationKeys|alias|aliases|키|별칭)\s*[:：]\s*([^|\n\r]{2,140})/gi;
    while ((match = keyPattern.exec(text))) {
      const parts = match[1]
        .split(/[,，、;；/]/)
        .map((part) => normalizeLoreCandidateName(part))
        .filter(Boolean);
      if (parts.length) {
        candidates.push({ name: parts[0], aliases: parts.slice(1, 6) });
      }
    }

    const headingPattern = /(?:^|\n)\s*(?:#{1,4}\s*)?([A-Z][A-Za-z0-9 _.'-]{1,35}|[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7a3][A-Za-z0-9 _.'\-\u3040-\u30ff\u3400-\u9fff\uac00-\ud7a3]{1,35})\s*(?:[:：]|[-–—]\s*(?:profile|profile|프로필|設定|プロフィール))/g;
    while ((match = headingPattern.exec(text))) {
      candidates.push({ name: match[1], aliases: [] });
    }
    return candidates;
  }

  function addLoreCharacterGuess(guesses, name, aliases, entryText, currentName) {
    const cleanName = normalizeLoreCandidateName(name);
    if (isBadLoreCandidateName(cleanName, currentName)) return;
    if (!isLikelyLorebookSpeakerEntry(entryText, cleanName)) return;
    const key = cleanName.toLowerCase();
    if (guesses.has(key)) {
      const existing = guesses.get(key);
      existing.aliases = mergeAliases(existing.aliases, aliases);
      return;
    }
    guesses.set(key, {
      name: cleanName,
      aliases: mergeAliases([], aliases),
      description: summarizeLoreCharacterEntry(entryText),
      voiceHints: "",
    });
  }

  function mergeAliases(existing, incoming) {
    const result = [];
    const seen = new Set();
    for (const alias of [...(existing || []), ...(incoming || [])]) {
      const clean = normalizeLoreAliasCandidate(alias);
      const key = clean.toLowerCase();
      if (!clean || seen.has(key) || isBadLoreMatchKey(clean, "")) continue;
      seen.add(key);
      result.push(clean);
    }
    return result.slice(0, 16);
  }

  function normalizeLoreCandidateName(value) {
    let text = String(value || "")
      .replace(/^[\s"'`*_#[\]{}<>]+|[\s"'`*_#[\]{}<>]+$/g, "")
      .replace(/^(?:name|characterName|displayName|character|char|speaker|이름|캐릭터|캐릭터명|인물|名前|キャラクター|人物)\s*[:：]\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
    const wrapped = text.match(/^[\(（]\s*([^()（）]+)\s*[\)）]$/);
    if (wrapped) text = wrapped[1].trim();
    if ((text.startsWith("(") || text.startsWith("（")) && !/[\)）]/.test(text)) {
      text = text.slice(1).trim();
    }
    if ((text.endsWith(")") || text.endsWith("）")) && !/[\(（]/.test(text)) {
      text = text.slice(0, -1).trim();
    }
    text = text.split(/[|\n\r。．]/)[0].trim();
    text = text.replace(/\s*(?:profile|프로필|設定|プロフィール)\s*$/i, "").trim();
    return text.slice(0, 80);
  }

  function isBadLoreCandidateName(name, currentName) {
    const clean = String(name || "").trim();
    const lower = clean.toLowerCase();
    const fieldKey = lower
      .replace(/[_-]+/g, " ")
      .replace(/[^a-z0-9가-힣ぁ-んァ-ヶ一-龯]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean || clean.length < 2 || clean.length > 80) return true;
    if (currentName && lower === currentName) return true;
    if (BLOCKED_LORE_CHARACTER_NAMES.has(lower) || BLOCKED_LORE_CHARACTER_NAMES.has(fieldKey)) return true;
    if (/(?:affiliation|birth|breathing|combat|feature|personality|profile|relationship|technique|voice|weapon|occupation|summary|description|appearance|background|status|rank|gender|age|year)/i.test(fieldKey)) return true;
    if (/^(?:소속|생년|출생|호흡|전투|기술|특징|성격|프로필|관계|무기|직업|설명|외형|배경|상태|계급|성별|나이|목소리|말투)$/.test(fieldKey)) return true;
    if (/^(?:content|prompt|text|memo|comment|description|desc|key|keys|entry|entries|root|lorebook|world|scenario|persona|profile|character|speaker|voice|tone|age|gender)$/i.test(clean)) return true;
    if (/^(?:내용|본문|설명|세계관|로어북|프로필|캐릭터|인물|목소리|나이|성별|性格|声|名前|人物|設定)$/i.test(clean)) return true;
    if (/^\d+$/.test(clean)) return true;
    if (/[{}<>]/.test(clean)) return true;
    if (!/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7a3]/.test(clean) && clean.split(/\s+/).length > 4) return true;
    return false;
  }

  function summarizeLoreCharacterEntry(value) {
    return String(value || "")
      .replace(/^[^:]{0,90}:\s*/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 260);
  }

  function extractCaptionText(value) {
    const text = typeof value === "string" ? value : extractTextFromUnknown(value);
    const trimmed = String(text || "").trim();
    if (!trimmed || trimmed === "[object Object]") return "";

    if (/^\{[\s\S]*\}$/.test(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractTextFromUnknown({
          caption: parsed.caption || parsed.voiceCaption || parsed.voice_design_caption || parsed.text || parsed.content || parsed.message,
        }) || extractTextFromUnknown(parsed);
      } catch {
        const captionMatch = trimmed.match(/["']?(?:caption|voiceCaption|voice_design_caption)["']?\s*[:：]\s*["']?([\s\S]*?)(?:["']?\s*\}\s*$|$)/i);
        if (captionMatch?.[1]) return captionMatch[1].trim();
        return trimmed;
      }
    }

    return trimmed;
  }

  function stripJsonTail(value) {
    let text = String(value || "").trim();
    text = text.replace(/[`"']+\s*\}\s*$/g, "");
    text = text.replace(/[`"']+\s*$/g, "");
    const trailingBrace = text.lastIndexOf("}");
    const lastJapanese = Math.max(
      text.search(/[\u3040-\u30ff\u3400-\u9fff][^]*$/),
      -1,
    );
    if (trailingBrace > 0 && trailingBrace > lastJapanese) {
      text = text.slice(0, trailingBrace).trim();
    }
    return text;
  }

  function preferJapaneseCaption(value) {
    let text = String(value || "").trim();
    if (!text) return "";
    const firstJapanese = text.match(/(?:\d+\s*)?[\u3040-\u30ff\u3400-\u9fff]/);
    if (firstJapanese && firstJapanese.index > 0) {
      text = text.slice(firstJapanese.index).trim();
    }
    const fenced = text.match(/```[\s\S]*?```/);
    if (fenced && text.indexOf(fenced[0]) === 0) {
      text = text.replace(/^```(?:\w+)?/i, "").replace(/```$/i, "").trim();
    }
    const stopMarkers = [
      "\n1)",
      "\n1.",
      "\n```",
      "\nPowerShell",
      "\nSet-Location",
      "\nuv run",
    ];
    for (const marker of stopMarkers) {
      const index = text.indexOf(marker);
      if (index > 0) text = text.slice(0, index).trim();
    }
    return text;
  }

  function makeVoiceIdBase(character) {
    const base = String(character?.name || getCharacterId(character) || "character")
      .normalize("NFKD")
      .replace(/[^\w가-힣ぁ-んァ-ヶ一-龯-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
    return base || "character";
  }

  function normalizeGeneratedVoiceReferences(result, character, caption, sampleText = "") {
    const characterId = getCharacterId(character);
    const rawReferences = Array.isArray(result)
      ? result
      : Array.isArray(result?.references)
        ? result.references
        : Array.isArray(result?.voices)
          ? result.voices
          : Array.isArray(result?.files)
            ? result.files
            : [];

    const referenceResponses = rawReferences.length
      ? rawReferences.map((item, index) => normalizeReferenceResponseItem(item, index))
      : [normalizeReferenceResponseItem(result, 0)];

    const usable = referenceResponses.filter((reference) => reference.voiceId || reference.file || reference.url || reference.label);
    const parentCharacter = character?.parentCharacter || null;
    const botId = isDefaultGlobalVoiceCharacterId(characterId)
      ? GLOBAL_BOT_ID
      : getCharacterId(parentCharacter || character);
    const botName = isDefaultGlobalVoiceCharacterId(characterId)
      ? GLOBAL_BOT_NAME
      : parentCharacter?.name || character?.name || botId;

    return {
      botId,
      botName,
      characterId,
      characterName: character?.name || characterId,
      caption,
      sampleText: cleanVoiceDesignSampleText(result?.text || result?.input || result?.sampleText || result?.sample_text || sampleText || ""),
      generatedAt: new Date().toISOString(),
      model: "Aratako/Irodori-TTS-600M-v3-VoiceDesign",
      references: usable,
      raw: result,
    };
  }

  function referenceMergeKey(reference, index) {
    return [
      reference?.voiceId,
      reference?.file,
      reference?.url,
      reference?.previewUrl,
      reference?.label,
    ].map((value) => String(value || "").trim()).find(Boolean) || `reference_${index}`;
  }

  function mergeVoiceReferenceSet(existing, incoming) {
    if (!existing) {
      const next = incoming ? {
        ...incoming,
        displayColor: normalizeVoiceColor(incoming.displayColor) || defaultVoiceColorForCharacter(incoming.characterId, incoming.characterName),
      } : incoming;
      return isDefaultGlobalVoiceCharacterId(next?.characterId) ? defaultGlobalReferenceSetForId(next.characterId, next) : next;
    }
    if (!incoming) {
      return isDefaultGlobalVoiceCharacterId(existing?.characterId) ? defaultGlobalReferenceSetForId(existing.characterId, existing) : existing;
    }

    const mergedReferences = [];
    const seen = new Set();
    for (const reference of [
      ...referenceItems(existing),
      ...referenceItems(incoming),
    ]) {
      const key = referenceMergeKey(reference, mergedReferences.length);
      if (seen.has(key)) continue;
      seen.add(key);
      mergedReferences.push(reference);
    }

    const merged = {
      ...existing,
      ...incoming,
      botId: existing.botId || incoming.botId,
      botName: existing.botName || incoming.botName,
      characterId: existing.characterId || incoming.characterId,
      characterName: existing.characterName || incoming.characterName,
      lorebookCharacter: Boolean(existing.lorebookCharacter || incoming.lorebookCharacter),
      characterProfile: existing.characterProfile || incoming.characterProfile || null,
      discoveredAt: existing.discoveredAt || incoming.discoveredAt || "",
      caption: incoming.caption || existing.caption || "",
      sampleText: incoming.sampleText || existing.sampleText || "",
      generatedAt: incoming.generatedAt || existing.generatedAt || "",
      model: incoming.model || existing.model || "",
      displayColor: normalizeVoiceColor(incoming.displayColor) || normalizeVoiceColor(existing.displayColor) || defaultVoiceColorForCharacter(existing.characterId || incoming.characterId, existing.characterName || incoming.characterName),
      references: mergedReferences,
      raw: incoming.raw || existing.raw || null,
    };
    return isDefaultGlobalVoiceCharacterId(merged.characterId)
      ? defaultGlobalReferenceSetForId(merged.characterId, merged)
      : merged;
  }

  function createEmptyReferenceSetForMove(targetCharacterId, targetName = "", targetBotId = "", targetBotName = "") {
    if (isDefaultGlobalVoiceCharacterId(targetCharacterId)) {
      return defaultGlobalReferenceSetForId(targetCharacterId);
    }
    const characterId = targetCharacterId || targetBotId || "character";
    const characterName = targetName || targetBotName || characterId;
    return {
      botId: targetBotId || characterId,
      botName: targetBotName || characterName,
      characterId,
      characterName,
      lorebookCharacter: false,
      characterProfile: null,
      caption: "",
      sampleText: "",
      generatedAt: "",
      discoveredAt: "",
      model: "Aratako/Irodori-TTS-600M-v3-VoiceDesign",
      displayColor: defaultVoiceColorForCharacter(characterId, characterName),
      references: [],
      raw: null,
    };
  }

  async function moveVoiceReferenceBetweenCharacters(sourceCharacterId, referenceIndex, voiceId, targetMeta = {}) {
    const targetCharacterId = targetMeta.characterId || "";
    if (!sourceCharacterId || !targetCharacterId) {
      throw new Error("이동할 레퍼런스나 대상 캐릭터를 찾지 못했습니다.");
    }
    if (sourceCharacterId === targetCharacterId) {
      return {
        moved: false,
        reason: "same-target",
        message: "이미 같은 캐릭터 아래에 있는 레퍼런스입니다.",
      };
    }

    const sourceSet = voiceReferencesByCharacter[sourceCharacterId];
    const sourceReferences = [...referenceItems(sourceSet)];
    let index = Number(referenceIndex);
    if (!Number.isInteger(index) || sourceReferences[index]?.voiceId !== voiceId) {
      index = sourceReferences.findIndex((reference) => (reference.voiceId || "") === voiceId);
    }
    if (index < 0) {
      throw new Error(`이동할 레퍼런스 ${voiceId || ""}를 찾지 못했습니다.`);
    }

    const [reference] = sourceReferences.splice(index, 1);
    const targetExisting = voiceReferencesByCharacter[targetCharacterId] || null;
    const targetSet = targetExisting || createEmptyReferenceSetForMove(
      targetCharacterId,
      targetMeta.characterName,
      targetMeta.botId,
      targetMeta.botName,
    );
    const targetReferences = [...referenceItems(targetSet)];
    const targetKeys = new Set(targetReferences.map((item, itemIndex) => referenceMergeKey(item, itemIndex)));
    const referenceKey = referenceMergeKey(reference, targetReferences.length);
    const alreadyExists = targetKeys.has(referenceKey);
    if (!alreadyExists) {
      targetReferences.push(reference);
    }

    voiceReferencesByCharacter[sourceCharacterId] = sourceReferences.length ? {
      ...sourceSet,
      references: sourceReferences,
    } : clearReferenceDraftMetadata({
      ...sourceSet,
      references: [],
    });
    voiceReferencesByCharacter[targetCharacterId] = isDefaultGlobalVoiceCharacterId(targetCharacterId)
      ? defaultGlobalReferenceSetForId(targetCharacterId, {
          ...targetSet,
          references: targetReferences,
        })
      : {
          ...targetSet,
          references: targetReferences,
        };

    const voiceByCharacter = { ...config.voiceByCharacter };
    if (voiceId && voiceByCharacter[sourceCharacterId] === voiceId) {
      delete voiceByCharacter[sourceCharacterId];
    }
    await saveConfig({ ...readFormConfig(), voiceByCharacter });
    await saveVoiceReferences();

    const sourceName = sourceSet?.characterName || sourceCharacterId;
    const targetName = voiceReferencesByCharacter[targetCharacterId]?.characterName || targetMeta.characterName || targetCharacterId;
    return {
      moved: true,
      alreadyExists,
      voiceId: reference.voiceId || voiceId,
      sourceName,
      targetName,
    };
  }

  function makeLorebookCharacterId(parentCharacter, name) {
    return `lore:${getCharacterId(parentCharacter)}:${hashText(String(name || "").trim().toLowerCase())}`;
  }

  function findExistingLorebookReferenceKey(parentCharacter, discovered) {
    const parentId = getCharacterId(parentCharacter);
    const names = loreNameMatchKeys(discovered?.name, discovered?.aliases);
    if (!names.length) return "";
    for (const [key, referenceSet] of Object.entries(voiceReferencesByCharacter || {})) {
      if (!referenceSet?.lorebookCharacter) continue;
      if (referenceSet.botId && referenceSet.botId !== parentId) continue;
      const profile = referenceSet.characterProfile || {};
      const existingNames = loreNameMatchKeys(referenceSet.characterName || profile.name, profile.aliases);
      if (existingNames.some((value) => names.includes(value))) {
        return key;
      }
    }
    return "";
  }

  function makeLorebookReferenceSet(parentCharacter, discovered, existing = null) {
    const parentId = getCharacterId(parentCharacter);
    const parentName = parentCharacter?.name || parentId;
    const characterName = discovered.name || "Lorebook Character";
    const characterId = existing?.characterId || makeLorebookCharacterId(parentCharacter, characterName);
    const aliases = defaultMatchKeysForCharacter(characterName, discovered.aliases || []);
    const profile = {
      name: characterName,
      aliases,
      description: discovered.description || "",
      voiceHints: discovered.voiceHints || "",
    };
    return {
      botId: parentId,
      botName: parentName,
      characterId,
      characterName,
      lorebookCharacter: true,
      characterProfile: profile,
      caption: existing?.caption || "",
      sampleText: existing?.sampleText || "",
      generatedAt: existing?.generatedAt || "",
      discoveredAt: existing?.discoveredAt || new Date().toISOString(),
      model: existing?.model || "Aratako/Irodori-TTS-600M-v3-VoiceDesign",
      displayColor: normalizeVoiceColor(existing?.displayColor) || defaultVoiceColorForCharacter(characterId, characterName),
      references: referenceItems(existing),
      raw: existing?.raw || null,
    };
  }

  function speakerMatchScore(speakerName, referenceSet, currentBotId) {
    const speaker = normalizeLoreCandidateName(cleanSpeakerName(speakerName)).toLowerCase();
    if (!speaker || !referenceSet) return { score: 0, baseScore: 0, matchKind: "none", matchedKey: "", speaker };
    const speakerKeys = expandNameMatchVariants(speaker);
    const profile = referenceSet.characterProfile || {};
    const names = loreSpeakerMatchKeys(referenceSet.characterName || profile.name, profile.aliases);
    if (!speakerKeys.length || (!names.full.length && !names.tokens.length)) {
      return { score: 0, baseScore: 0, matchKind: "none", matchedKey: "", speaker };
    }

    let baseScore = 0;
    let matchKind = "none";
    let matchedKey = "";
    const exactKey = speakerKeys.find((key) => names.full.includes(key));
    const tokenKey = speakerKeys.find((key) => names.tokens.includes(key));
    if (exactKey) {
      baseScore = 100;
      matchKind = "exact";
      matchedKey = exactKey;
    } else if (tokenKey) {
      baseScore = 60;
      matchKind = "token";
      matchedKey = tokenKey;
    } else {
      const partial = names.full.find((name) => speakerKeys.some((key) => name.length >= 2 && key.length >= 2 && (name.includes(key) || key.includes(name))));
      if (partial) {
        baseScore = 45;
        matchKind = "partial";
        matchedKey = partial;
      }
    }
    if (!baseScore) return { score: 0, baseScore: 0, matchKind: "none", matchedKey: "", speaker };

    let score = baseScore;
    if (referenceSet.botId === currentBotId) score += 40;
    if (referenceSet.botId === GLOBAL_BOT_ID) score += 4;
    if (config.voiceByCharacter?.[referenceSet.characterId]) score += 10;
    return { score, baseScore, matchKind, matchedKey, speaker };
  }

  function findVoiceCharacterBySpeaker(speakerName, currentBotId) {
    const candidates = [];
    for (const [key, referenceSet] of Object.entries(voiceReferencesByCharacter || {})) {
      if (!referenceSet || isDefaultGlobalVoiceCharacterId(referenceSet.characterId)) continue;
      if (referenceSet.botId && referenceSet.botId !== currentBotId && referenceSet.botId !== GLOBAL_BOT_ID) continue;
      const match = speakerMatchScore(speakerName, referenceSet, currentBotId);
      if (match.score > 0) candidates.push({ key, referenceSet, ...match });
    }
    if (!candidates.length) return null;

    const exactCandidates = candidates.filter((candidate) => candidate.matchKind === "exact");
    if (exactCandidates.length) {
      exactCandidates.sort((a, b) => b.score - a.score);
      const best = exactCandidates[0];
      const tied = exactCandidates.filter((candidate) => candidate.score === best.score && candidate.matchedKey === best.matchedKey);
      return tied.length === 1 ? best : null;
    }

    const strongestBaseScore = Math.max(...candidates.map((candidate) => candidate.baseScore));
    const strongest = candidates.filter((candidate) => candidate.baseScore === strongestBaseScore);
    if (strongest.length !== 1) return null;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || null;
  }

  function pruneBlockedLorebookCharacters(parentCharacter) {
    const parentId = getCharacterId(parentCharacter);
    const parentName = normalizeLoreCandidateName(parentCharacter?.name || parentId).toLowerCase();
    let removed = 0;
    for (const [key, referenceSet] of Object.entries(voiceReferencesByCharacter || {})) {
      if (!referenceSet?.lorebookCharacter) continue;
      if (referenceSet.botId && referenceSet.botId !== parentId) continue;
      const name = referenceSet.characterName || referenceSet.characterProfile?.name || "";
      if (!isBadLoreCandidateName(name, parentName)) continue;
      delete voiceReferencesByCharacter[key];
      removed += 1;
    }
    return removed;
  }

  function characterFromReferenceSet(referenceSet, parentCharacter) {
    const profile = referenceSet?.characterProfile || {};
    const aliases = Array.isArray(profile.aliases) ? profile.aliases : [];
    const lorebookHints = [
      profile.description,
      profile.voiceHints,
      aliases.length ? `aliases: ${aliases.join(", ")}` : "",
      referenceSet?.caption ? `이전 보이스 디자인 캡션: ${referenceSet.caption}` : "",
      referenceSet?.sampleText ? `previous sampleText: ${referenceSet.sampleText}` : "",
    ].filter(Boolean);
    return {
      chaId: referenceSet?.characterId,
      id: referenceSet?.characterId,
      name: referenceSet?.characterName || profile.name || referenceSet?.characterId,
      description: profile.description || "",
      personality: profile.voiceHints || "",
      scenario: parentCharacter?.scenario || "",
      aliases,
      lorebookHints,
      parentCharacter,
    };
  }

  function normalizeReferenceResponseItem(item, index) {
    if (typeof item === "string") {
      return {
        id: `reference_${index + 1}`,
        label: item,
        voiceId: voiceIdFromPath(item),
        file: item,
      };
    }
    const value = item && typeof item === "object" ? item : {};
    const file = value.file || value.path || value.output || value.wav || value.audio || value.filename || "";
    const voiceId = value.voiceId || value.voice_id || value.voice || value.id || value.name || voiceIdFromPath(file);
    return {
      id: String(value.id || value.voiceId || value.voice_id || `reference_${index + 1}`),
      label: String(value.label || value.name || voiceId || `보이스_${index + 1}`),
      voiceId: voiceId ? String(voiceId) : "",
      file: file ? String(file) : "",
      url: value.url || value.href || "",
      previewUrl: value.previewUrl || value.preview_url || "",
      caption: value.caption || "",
      seed: value.seed || value.used_seed || "",
    };
  }

  function voiceIdFromPath(path) {
    const text = String(path || "").trim();
    if (!text) return "";
    const filename = text.split(/[\\/]/).pop() || text;
    return filename.replace(/\.[a-z0-9]+$/i, "");
  }

  function helperAudioUrlForVoice(voiceId) {
    if (!voiceId) return "";
    try {
      const url = new URL(config.ttsModelEndpoint || DEFAULT_CONFIG.ttsModelEndpoint);
      if (/\/v1\/voice-design\/?$/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\/v1\/voice-design\/?$/i, "/v1/voice-audio");
      } else {
        url.pathname = "/v1/voice-audio";
      }
      url.search = "";
      url.searchParams.set("voiceId", voiceId);
      return url.toString();
    } catch {
      return "";
    }
  }

  function helperAudioPostUrl() {
    try {
      const url = new URL(config.ttsModelEndpoint || DEFAULT_CONFIG.ttsModelEndpoint);
      if (/\/v1\/voice-design\/?$/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\/v1\/voice-design\/?$/i, "/v1/voice-audio");
      } else {
        url.pathname = "/v1/voice-audio";
      }
      url.search = "";
      return url.toString();
    } catch {
      return "";
    }
  }

  function helperVoiceListUrl() {
    try {
      const url = new URL(config.ttsModelEndpoint || DEFAULT_CONFIG.ttsModelEndpoint);
      if (/\/v1\/voice-design\/?$/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\/v1\/voice-design\/?$/i, "/v1/voice-audio/list");
      } else {
        url.pathname = "/v1/voice-audio/list";
      }
      url.search = "";
      return url.toString();
    } catch {
      return "";
    }
  }

  function helperVoiceMetadataUrl() {
    try {
      const url = new URL(config.ttsModelEndpoint || DEFAULT_CONFIG.ttsModelEndpoint);
      if (/\/v1\/voice-design\/?$/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\/v1\/voice-design\/?$/i, "/v1/voice-metadata");
      } else {
        url.pathname = "/v1/voice-metadata";
      }
      url.search = "";
      return url.toString();
    } catch {
      return "";
    }
  }

  function helperRenameUrl() {
    try {
      const url = new URL(config.ttsModelEndpoint || DEFAULT_CONFIG.ttsModelEndpoint);
      if (/\/v1\/voice-design\/?$/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\/v1\/voice-design\/?$/i, "/v1/voice-audio/rename");
      } else {
        url.pathname = "/v1/voice-audio/rename";
      }
      url.search = "";
      return url.toString();
    } catch {
      return "";
    }
  }

  function helperResearchUrl() {
    try {
      const url = new URL(config.ttsModelEndpoint || DEFAULT_CONFIG.ttsModelEndpoint);
      if (/\/v1\/voice-design\/?$/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\/v1\/voice-design\/?$/i, "/v1/character-research");
      } else {
        url.pathname = "/v1/character-research";
      }
      url.search = "";
      return url.toString();
    } catch {
      return "";
    }
  }

  function helperStatusUrl() {
    try {
      const url = new URL(config.ttsModelEndpoint || DEFAULT_CONFIG.ttsModelEndpoint);
      if (/\/v1\/voice-design\/?$/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\/v1\/voice-design\/?$/i, "/v1/status-log");
      } else {
        url.pathname = "/v1/status-log";
      }
      url.search = "";
      return url.toString();
    } catch {
      return "";
    }
  }

  function notifyHelperStatus(event, details = {}) {
    const url = helperStatusUrl();
    if (!url) return;
    const payload = {
      event,
      pluginVersion: PLUGIN_VERSION,
      speakerName: details.speakerName || "",
      characterName: details.characterName || "",
      voice: details.voice || "",
      text: details.text || "",
      bytes: details.bytes || 0,
      error: details.error || "",
    };
    Promise.resolve()
      .then(() => api.nativeFetch(url, {
        method: "POST",
        headers: buildTtsHeaders(true),
        body: JSON.stringify(payload),
        interceptor: false,
      }))
      .catch(() => {});
  }

  function helperHealthUrl() {
    try {
      const url = new URL(config.ttsModelEndpoint || DEFAULT_CONFIG.ttsModelEndpoint);
      url.pathname = "/health";
      url.search = "";
      return url.toString();
    } catch {
      return "";
    }
  }

  function compactCharacterSheet(character) {
    if (!character) return {};
    return {
      id: getCharacterId(character),
      name: character.name || "",
      description: character.description || character.desc || "",
      personality: character.personality || "",
      scenario: character.scenario || "",
      creatorNotes: character.creatorNotes || character.creatorcomment || character.note || "",
      tags: Array.isArray(character.tags) ? character.tags.join(", ") : (character.tags || ""),
      firstMessage: character.firstMessage || character.firstMessageOverride || "",
      exampleMessage: character.exampleMessage || "",
    };
  }

  function buildTtsHeaders(withJsonContentType) {
    const headers = {};
    if (withJsonContentType) {
      headers["Content-Type"] = "application/json";
    }
    if (config.ttsApiKey) {
      headers.Authorization = `Bearer ${config.ttsApiKey}`;
    }
    return headers;
  }

  function mimeForFormat(format) {
    const value = String(format || "wav").toLowerCase();
    if (value === "mp3") return "audio/mpeg";
    if (value === "flac") return "audio/flac";
    if (value === "opus") return "audio/ogg";
    if (value === "aac") return "audio/aac";
    if (value === "pcm") return "audio/pcm";
    return "audio/wav";
  }

  async function detectConfiguredModelNames() {
    const fallback = { main: "", aux: "" };
    if (typeof api.getDatabase !== "function") return fallback;
    const db = await api.getDatabase([
      "seperateModels",
      "seperateModelsForAxModels",
      "model",
      "models",
      "mainModel",
      "otherAxModel",
      "api",
      "apis",
      "settings",
      "config",
    ]).catch(() => null);
    if (!db) return fallback;
    return {
      main: findConfiguredModelName(db, ["main", "chat", "normal", "primary"]) || fallback.main,
      aux: findConfiguredModelName(db, ["otherax", "aux", "sub", "assistant", "secondary"]) || fallback.aux,
    };
  }

  function findConfiguredModelName(value, modeKeywords) {
    const candidates = [];
    collectModelNameCandidates(value, "", modeKeywords, candidates, 0);
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.value || "";
  }

  function collectModelNameCandidates(value, path, modeKeywords, candidates, depth) {
    if (depth > 7 || value == null) return;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value || "").trim();
      if (!isPlausibleModelName(text)) return;
      const lowerPath = path.toLowerCase();
      let score = looksLikeModelName(text) ? 20 : 4;
      if (/(^|\.)(model|modelname|modelid|staticmodel|name|id)$/i.test(path)) score += 18;
      if (modeKeywords.some((keyword) => lowerPath.includes(keyword))) score += 35;
      if (/seperatemodelsforaxmodels|otherax|aux|sub|assistant/i.test(lowerPath)) score += modeKeywords.includes("otherax") || modeKeywords.includes("aux") ? 18 : -8;
      if (/seperatemodels|main|chat|primary/i.test(lowerPath)) score += modeKeywords.includes("main") ? 10 : 0;
      candidates.push({ value: text, score });
      return;
    }
    if (typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.slice(0, 80).forEach((item, index) => collectModelNameCandidates(item, `${path}[${index}]`, modeKeywords, candidates, depth + 1));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      collectModelNameCandidates(child, path ? `${path}.${key}` : key, modeKeywords, candidates, depth + 1);
    }
  }

  function isPlausibleModelName(value) {
    const text = String(value || "").trim();
    if (!text || text.length < 2 || text.length > 160) return false;
    if (/^https?:\/\//i.test(text)) return false;
    if (/^(true|false|null|undefined|none|default)$/i.test(text)) return false;
    if (/^[A-Za-z0-9+/=_-]{40,}$/.test(text) && !/[.:/]/.test(text)) return false;
    return true;
  }

  function looksLikeModelName(value) {
    return /(gpt|claude|gemini|deepseek|qwen|llama|mistral|mixtral|sonnet|opus|haiku|openrouter|kobold|ooba|ollama|pluginmodel|model|turbo|instruct|chat|local|nai|novel|anthropic|google|openai)/i.test(String(value || ""));
  }

  function modelOptionHint(modelName, overrideValue) {
    if (overrideValue) return `override 우선: ${overrideValue}`;
    return modelName ? `사용 모델: ${modelName}` : "";
  }

  async function renderSettings() {
    await loadConfig();
    if (config.autoStopOnContextChange !== false) {
      await stopPlaybackForNavigation("RisuTTS 환경설정을 열었습니다.").catch(() => {});
    }
    await api.showContainer("fullscreen");

    const character = await api.getCharacter().catch(() => null);
    const hasCurrentCharacter = isRealRisuCharacter(character);
    const characterId = hasCurrentCharacter ? getCharacterId(character) : "";
    const characterName = hasCurrentCharacter ? (character?.name || characterId) : "";
    if (hasCurrentCharacter) {
      await pruneEmptyCurrentBotDraftReferenceSet(character);
    }
    await pruneEmptyReferenceDraftMetadata();
    const configuredModelNames = await detectConfiguredModelNames();

    document.body.innerHTML = `
      <main class="rt-page">
        <header class="rt-header">
          <div>
            <h1>${PLUGIN_DISPLAY_NAME}</h1>
          </div>
          <div class="rt-header-actions">
            <button id="rt-open-log" class="rt-button secondary" type="button">로그</button>
            <button id="rt-close" class="rt-button secondary" type="button">닫기</button>
          </div>
        </header>

        <form id="rt-form" class="rt-layout">
          <div class="rt-sidebar">
            <section class="rt-panel">
            <div class="rt-step-head">
              <span class="rt-step-index">1</span>
              <h2>연결</h2>
            </div>
            <div class="rt-field-grid">
              ${field("serverUrl", "TTS 서버 URL", config.serverUrl)}
              ${field("ttsModel", "TTS 모델", config.ttsModel)}
              ${field("ttsModelEndpoint", "TTS 모델 엔드포인트", config.ttsModelEndpoint)}
              ${passwordField("ttsApiKey", "TTS 서버 API Key", config.ttsApiKey, "서버 .env에 API Key를 설정한 경우에만 입력합니다. 비워두면 인증 없이 요청합니다.")}
              ${selectField("metadataProfileId", "메타데이터 프로필", config.metadataProfileId, METADATA_PROFILE_OPTIONS, "선택한 프로필의 보이스 탐색기 구성만 불러오고 저장합니다. 데이터 저장하기는 현재 화면을 서버에 저장하고, 데이터 불러오기는 서버의 해당 프로필을 화면으로 가져옵니다. wav 파일은 모든 프로필이 같은 서버 voices 폴더를 공유합니다.")}
            </div>
            <div class="rt-actions">
              <button id="rt-health" class="rt-button secondary" type="button">서버 확인</button>
              <button id="rt-save-server-data" class="rt-button secondary" type="button">데이터 저장하기</button>
              <button id="rt-import-server-data" class="rt-button secondary" type="button">데이터 불러오기</button>
            </div>
            <pre id="rt-status" class="rt-output">준비 완료</pre>
            </section>

            <section class="rt-panel">
            <div class="rt-step-head">
              <span class="rt-step-index">2</span>
              <h2>캡션 모델</h2>
            </div>
            ${radioGroup("captionModelSource", "캡션 작성 모델", [
              ["aux", "보조 모델", modelOptionHint(configuredModelNames.aux, config.captionModel)],
              ["main", "메인 모델", modelOptionHint(configuredModelNames.main, config.captionModel)],
            ], config.captionModelSource)}
            <details class="rt-fold">
              <summary>캡션 모델 세부 설정</summary>
              <label class="rt-label">
                <span>로어북 스캔 프롬프트</span>
                <textarea id="lorebookScanPrompt" rows="9">${htmlEscape(config.lorebookScanPrompt || DEFAULT_LOREBOOK_SCAN_PROMPT)}</textarea>
                <small>로어북 캐릭터 스캔에서 사용할 지시 프롬프트입니다. 모델은 위의 캡션 작성 모델 설정을 그대로 사용합니다. JSON 반환 형식 안내는 안정성을 위해 자동으로 덧붙습니다.</small>
              </label>
              <div class="rt-field-grid">
                ${field("captionModel", "캡션 모델", config.captionModel, "비워두면 위에서 선택한 메인/보조 모델을 사용합니다. 엔드포인트를 쓸 때는 요청 model 값으로 사용합니다.")}
                ${field("captionEndpoint", "캡션 모델 엔드포인트", config.captionEndpoint, "비워두면 RisuAI runLLMModel 사용")}
                ${passwordField("captionApiKey", "캡션 모델 API Key", config.captionApiKey)}
              </div>
            </details>
            </section>

            <section class="rt-panel">
            <div class="rt-step-head">
              <span class="rt-step-index">3</span>
              <h2>RP 옵션</h2>
            </div>
            <label class="rt-check">
              <input id="koreanTranslateTts" type="checkbox" ${config.koreanTranslateTts ? "checked" : ""}>
              한국어/영어 대사에 번역+스피커 버튼 표시
            </label>
            <details class="rt-fold">
              <summary>TTS</summary>
              <label class="rt-option-card">
                <input id="readAllButtonEnabled" type="checkbox" ${config.readAllButtonEnabled !== false ? "checked" : ""}>
                <span>
                  <strong>전체 읽기 버튼 표시</strong>
                  <small>가장 위쪽 개별 대사 스피커 왼쪽에 전체 읽기 버튼을 표시합니다.</small>
                </span>
              </label>
              <label class="rt-option-card">
                <input id="autoStopOnContextChange" type="checkbox" ${config.autoStopOnContextChange !== false ? "checked" : ""}>
                <span>
                  <strong>화면/봇 전환 시 TTS 자동 중단</strong>
                  <small>다른 봇으로 이동하거나 RisuTTS 환경설정을 열면 진행 중인 재생과 생성 요청을 중단합니다.</small>
                </span>
              </label>
              ${selectField("ttsCacheMode", "대사 TTS 재생 방식", config.ttsCacheMode, [
                [TTS_CACHE_MODE_REUSE, "캐시 재사용 (기본)"],
                [TTS_CACHE_MODE_REGENERATE, "매번 새로 생성"],
              ], "캐시 재사용: 한 번 생성한 대사는 다시 누를 때 바로 재생. 매번 새로 생성: 매번 TTS 서버에 새로 요청.")}
              ${selectField("cudaCacheCleanupMode", "TTS 서버 VRAM 정리 방식", config.cudaCacheCleanupMode, [
                [CUDA_CACHE_CLEANUP_MODE_OFF, "정리하지 않음 (기본)"],
                [CUDA_CACHE_CLEANUP_MODE_THRESHOLD, "예약이 과할 때만 정리"],
                [CUDA_CACHE_CLEANUP_MODE_ALWAYS, "매 생성 후 정리"],
              ], "8GB VRAM 환경에서는 '예약이 과할 때만 정리' 권장.")}
              <label class="rt-option-card">
                <input id="referenceVolumeNormalize" type="checkbox" ${config.referenceVolumeNormalize ? "checked" : ""}>
                <span>
                  <strong>레퍼런스 음량 자동 보정</strong>
                  <small>외부 wav 레퍼런스의 볼륨 편차를 줄입니다. Irodori로 만든 레퍼런스만 쓴다면 꺼도 됩니다.</small>
                </span>
              </label>
              <div class="rt-field-grid">
                ${field("defaultVoice", "대체 보이스 ID", config.defaultVoice, "캐릭터 매칭과 글로벌 보이스가 모두 없을 때만 쓰는 최후 대체값입니다. 보통은 none으로 둡니다.")}
                ${field("responseFormat", "응답 포맷", config.responseFormat, "보통 wav를 권장합니다. mp3/flac 등은 서버가 지원할 때만 사용하세요.")}
                ${numberField("numSteps", "생성 steps", config.numSteps, "4", "80", "1", "기본값 32, 권장 32~40. 높을수록 품질이 좋아질 수 있지만 생성 시간이 늘어납니다.")}
                ${numberField("speed", "속도", config.speed, "0.25", "4", "0.05", "기본값 1. 낮추면 느리게, 높이면 빠르게 말합니다.")}
                ${numberField("cfgScaleText", "Text CFG", config.cfgScaleText, "0", "20", "0.1", "기본값 3. 대사 내용을 얼마나 강하게 따를지 조절합니다. 너무 높으면 발음이 딱딱해질 수 있습니다.")}
                ${numberField("cfgScaleSpeaker", "Speaker CFG", config.cfgScaleSpeaker, "0", "20", "0.1", "기본값 7. 레퍼런스 목소리를 얼마나 강하게 따라갈지 조절합니다. 목소리가 약하게 따라오면 올리고, 감정 지시가 묻히면 조금 낮춰볼 수 있습니다.")}
                ${numberField("cfgScaleCaption", "캡션 CFG", config.cfgScaleCaption, "0", "20", "0.1", "기본값 5. 보이스 디자인 계열에서 감정 디렉터 캡션을 얼마나 강하게 따를지 조절합니다. 속삭임처럼 변화가 약하면 7~9를 시도하세요.")}
                ${numberField("chunkMinChars", "Chunk 최소 글자 수", config.chunkMinChars, "1", "300", "1", "기본값 200. 긴 대사를 나누는 기준입니다. 낮추면 짧게 쪼개고, 높이면 한 번에 길게 읽습니다.")}
                ${numberField("longMessageSpeakerButtonLimit", "장문 개별 스피커 표시 제한", config.longMessageSpeakerButtonLimit, "0", String(LONG_MESSAGE_SPEAKER_BUTTON_LIMIT_MAX), "1", `기본값 ${LONG_MESSAGE_SPEAKER_BUTTON_LIMIT_DEFAULT}. 2500자 넘는 메시지는 처음 ${LONG_MESSAGE_SPEAKER_BUTTON_LIMIT_DEFAULT}개만 바로 표시하고, +${LONG_MESSAGE_SPEAKER_BUTTON_LIMIT_DEFAULT} 버튼을 누르면 다음 묶음을 누적 표시합니다. 전체 읽기는 모든 조각을 포함하며, 0은 제한 없음입니다.`)}
                ${numberField("readAllPrefetchAhead", "전체 읽기 선준비 수", config.readAllPrefetchAhead, "0", String(READ_ALL_PREFETCH_AHEAD_MAX), "1", `기본값 ${READ_ALL_PREFETCH_AHEAD_DEFAULT}. 전체 읽기 중 순차적으로 다음 TTS를 미리 생성합니다. 0~${READ_ALL_PREFETCH_AHEAD_MAX}까지 설정할 수 있습니다.`)}
              </div>
            </details>
            <details class="rt-fold">
              <summary>감정 디렉터</summary>
              <label class="rt-option-card">
                <input id="emotionDirectorEnabled" type="checkbox" ${config.emotionDirectorEnabled ? "checked" : ""}>
                <span>
                  <strong>맥락을 읽어 감정 지시 생성</strong>
                  <small>켜면 설정한 모델이 앞뒤 대사와 지문을 읽고, 현재 대사의 감정과 말투 지시를 만듭니다.</small>
                </span>
              </label>
              <label class="rt-option-card">
                <input id="emotionDirectorContinueOnError" type="checkbox" ${config.emotionDirectorContinueOnError ? "checked" : ""}>
                <span>
                  <strong>실패 시 기존 TTS로 진행</strong>
                  <small>감정 디렉터 요청이 실패해도 원래 대사로 TTS 생성을 계속합니다.</small>
                </span>
              </label>
              <label class="rt-option-card">
                <input id="emotionDirectorCacheEnabled" type="checkbox" ${config.emotionDirectorCacheEnabled !== false ? "checked" : ""}>
                <span>
                  <strong>감정 디렉터 결과 캐시</strong>
                  <small>같은 대사, 주변 문맥, 프롬프트 조건에서는 감정 디렉터 결과를 재사용합니다. 끄면 새 TTS 생성 때마다 새로 판단합니다.</small>
                </span>
              </label>
              <label class="rt-label">
                <span>감정 디렉터 프롬프트</span>
                <textarea id="emotionDirectorPrompt" rows="10">${htmlEscape(config.emotionDirectorPrompt || DEFAULT_EMOTION_DIRECTOR_PROMPT)}</textarea>
                <small>감정과 연기 방향을 판단시키는 지시문입니다. 이모지 허용 목록과 대사 수정 규칙은 감정 적용 방식에 맞춰 플러그인이 자동으로 덧붙입니다.</small>
              </label>
              <div class="rt-prompt-preset-actions">
                <button id="rt-emotion-director-prompt-presets" class="rt-button secondary" type="button">프리셋 설정</button>
              </div>
              <div class="rt-field-grid">
                ${field("emotionDirectorModel", "감정 디렉터 모델", config.emotionDirectorModel, "대사/지문 조각을 읽고 감정/연기 캡션을 작성할 모델입니다. 예: gemma-3-4b-it")}
                ${field("emotionDirectorEndpoint", "감정 디렉터 엔드포인트", config.emotionDirectorEndpoint, "OpenAI 호환 /v1/chat/completions 엔드포인트를 입력합니다. 예: http://127.0.0.1:1234/v1/chat/completions")}
                ${passwordField("emotionDirectorApiKey", "감정 디렉터 API Key", config.emotionDirectorApiKey, "로컬 서버에서 인증을 쓰지 않으면 비워둘 수 있습니다.")}
                ${numberField("emotionDirectorContextBefore", "앞 대사/지문 수", config.emotionDirectorContextBefore, "0", "10", "1", "현재 대사 앞에서 감정 판단에 참고할 대사/지문 조각 수입니다.")}
                ${numberField("emotionDirectorContextAfter", "뒤 대사/지문 수", config.emotionDirectorContextAfter, "0", "10", "1", "현재 대사 뒤에서 감정 판단에 참고할 대사/지문 조각 수입니다.")}
                ${selectField("emotionDirectorApplyMode", "감정 적용 방식", config.emotionDirectorApplyMode, [
                  [EMOTION_DIRECTOR_MODE_CAPTION, "캡션만 사용"],
                  [EMOTION_DIRECTOR_MODE_CAPTION_EMOJI, "캡션 + 대사에 이모지 추가"],
                  [EMOTION_DIRECTOR_MODE_CAPTION_EMOJI_TEXT, "캡션 + 이모지 추가 + 대사 수정"],
                ], "기본 이모지 모드는 대사 앞쪽에 한 개를 넣어 톤을 유도합니다. 대사 수정 모드는 디렉터가 허용 이모지를 대사 안의 자연스러운 위치에 배치할 수 있습니다.")}
              </div>
              <small class="rt-warning-note">주의: 감정 디렉터 캡션은 캡션 지원 TTS 모델에서만 실제 연기 지시로 작동합니다. 현재 실행 스크립트는 Irodori-TTS-600M-v3-VoiceDesign을 사용하므로 캡션 반영을 확인할 수 있지만, 환경에 따라 생성 시간이 길거나 음색이 흔들릴 수 있습니다.</small>
            </details>
            <details class="rt-fold">
              <summary>번역</summary>
              <div class="rt-field-grid">
                ${radioGroup("translationMethod", "번역 방식", [
                  ["llm", "LLM 번역", "RisuAI 보조 모델 또는 엔드포인트로 번역"],
                  ["google", "구글 번역", "구글 번역 API (무료, API 키 불필요) — 빠르지만 품질이 떨어질 수 있음"],
                ], config.translationMethod)}
              </div>
              <label class="rt-label">
                <span>번역 프롬프트 (LLM 번역 시에만 사용)</span>
                <textarea id="translationPrompt" rows="6">${htmlEscape(config.translationPrompt || DEFAULT_TRANSLATION_PROMPT)}</textarea>
                <small>한국어/영어 대사를 일본어 TTS용 대사로 번역할 때 쓰는 지시문입니다. <code>{sourceLanguage}</code>는 Korean 또는 English로 자동 치환됩니다.</small>
              </label>
              <div class="rt-prompt-preset-actions">
                <button id="rt-translation-prompt-presets" class="rt-button secondary" type="button">프리셋 설정</button>
              </div>
              <div class="rt-field-grid">
                ${field("translationModel", "번역 모델", config.translationModel, "비워두면 RisuAI translate 보조 모델을 우선 사용")}
                ${field("translationEndpoint", "번역 모델 엔드포인트", config.translationEndpoint, "비워두면 RisuAI runLLMModel 사용")}
                ${passwordField("translationApiKey", "번역 모델 API Key", config.translationApiKey)}
              </div>
            </details>
            <details class="rt-fold">
              <summary>디버깅</summary>
              <label class="rt-label">
                <span>수동 감정 캡션</span>
                <textarea id="emotionDirectorManualCaption" rows="3" placeholder="예: 音量を抑えた低めの小声で、息を多めに混ぜ、耳元で近距離から囁く。声を張らず、明るくしすぎない。">${htmlEscape(config.emotionDirectorManualCaption || "")}</textarea>
                <small>테스트용입니다. 감정 디렉터 활성화 여부와 상관없이, 입력하면 모든 대사에 이 캡션을 강제로 사용합니다. 비워두면 기존 설정대로 동작합니다.</small>
              </label>
              ${field("debugTtsSeed", "디버그 Seed 고정", config.debugTtsSeed, "같은 대사와 캡션에서 seed 차이를 제거하고 비교할 때 사용합니다. 0~9007199254740991 사이의 정수를 입력하세요. 비워두면 기존처럼 동작합니다.")}
              <div class="rt-debug-request-block">
                <label class="rt-label">
                  <span>마지막 TTS 요청</span>
                  <pre id="rt-last-tts-request" class="rt-output rt-debug-output">${htmlEscape(lastTtsRequestDebugText())}</pre>
                  <small class="rt-warning-note">주의: 이 디버그 출력에는 마지막 대사 원문, 감정 캡션, endpoint가 보일 수 있습니다. 공개 버그 리포트에는 로그 창의 로그 복사를 사용하세요.</small>
                </label>
                <div class="rt-debug-request-actions">
                  <button id="rt-clear-audio-cache" class="rt-button secondary" type="button">임시 TTS 캐시 비우기</button>
                </div>
              </div>
            </details>
            </section>
          </div>

          <div class="rt-explorer-column">
            <section class="rt-panel">
              <div class="rt-step-head">
                <span class="rt-step-index">A</span>
                <h2>보이스 탐색기</h2>
              </div>
              <div class="rt-actions">
                <button id="rt-scan-lorebook-characters" class="rt-button secondary" type="button">로어북 캐릭터 스캔</button>
                <button id="rt-add-lorebook-character" class="rt-button secondary" type="button">+ 캐릭터 추가</button>
              </div>
              <details class="rt-batch-ops" open>
                <summary>일괄 작업 (선택 캐릭터)</summary>
                <div class="rt-batch-actions">
                  <button id="rt-batch-select-all" class="rt-button secondary" type="button">전체 선택</button>
                  <button id="rt-batch-deselect-all" class="rt-button secondary" type="button">전체 해제</button>
                  <button id="rt-batch-captions" class="rt-button" type="button" disabled>선택 캡션 생성</button>
                  <label class="rt-batch-concurrency" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;">
                    <span>동시요청</span>
                    <input id="rt-batch-concurrency" type="number" min="1" max="${BATCH_CAPTION_CONCURRENCY_MAX}" step="1" value="${config.batchCaptionConcurrency}" style="width:48px;padding:4px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;" title="캡션 생성 동시 요청 개수 (1~${BATCH_CAPTION_CONCURRENCY_MAX})">
                  </label>
                  <button id="rt-batch-references" class="rt-button" type="button" disabled>선택 레퍼런스 생성</button>
                  <button id="rt-batch-auto-select" class="rt-button secondary" type="button" disabled>자동 보이스 할당</button>
                </div>
                <div id="rt-batch-progress" class="rt-batch-progress" hidden title="클릭하면 현재 캐릭터까지만 처리하고 중단합니다">
                  <div class="rt-batch-progress-bar"><div id="rt-batch-progress-fill"></div></div>
                  <span id="rt-batch-progress-text"></span>
                </div>
                <p class="rt-muted rt-batch-hint">캐릭터 이름 앞 체크박스로 여러 캐릭터를 선택한 뒤 일괄 작업 버튼을 누르세요. 캡션은 각 캐릭터의 로어북 정보를 읽어 순차적으로 생성합니다. 레퍼런스 생성은 캡션이 없으면 먼저 캡션을 만든 뒤 레퍼런스를 생성하고, 사용되지 않은 보이스를 자동 선택합니다.</p>
              </details>
              <div class="rt-info-note">
                <span class="rt-info-mark">i</span>
                <span>로어북 캐릭터 스캔은 <strong>캡션 모델</strong>을 사용합니다.</span>
              </div>
              <label class="rt-check rt-global-toggle">
                <input id="globalNarrationEnabled" type="checkbox" ${config.globalNarrationEnabled ? "checked" : ""}>
                글로벌 보이스 사용
              </label>
              ${renderVoiceExplorer(
                hasCurrentCharacter ? character : null,
                hasCurrentCharacter ? characterId : GLOBAL_NARRATION_ID,
                hasCurrentCharacter ? characterId : GLOBAL_BOT_ID,
              )}
              ${renderVoiceFileMaintenance()}
              ${renderHiddenBotManager()}
            </section>
          </div>

          <div class="rt-reference-column">
            <section class="rt-panel">
              <div class="rt-step-head">
                <span class="rt-step-index">B</span>
                <h2>레퍼런스 설정</h2>
              </div>
              <p class="rt-warning-note">주의: 실존 인물, 성우, 유명인, 주변인의 목소리를 허락 없이 복제하거나 사칭하는 용도로 보이스 레퍼런스를 만들지 마세요. 생성 음성으로 타인을 속이거나 실제 발언처럼 오해하게 만드는 사용도 금지됩니다.</p>
              <label class="rt-label">
                <span>생성 방향</span>
                <textarea id="rt-voice-guidance" rows="3" placeholder="예: 목소리는 더 낮고 차분하게. 대사는 위협적이지만 과장되지 않게.">${htmlEscape(config.voiceDesignGuidance || "")}</textarea>
                <small>캡션과 레퍼런스 생성용 대사를 만들 때 LLM에 전달할 요청입니다.</small>
              </label>
              <details class="rt-sub-details" open>
                <summary>캐릭터 조사 자료</summary>
                <label class="rt-label">
                  <span>참고 URL</span>
                  <textarea id="rt-voice-research-urls" rows="2" placeholder="예: https://namu.wiki/w/...">${htmlEscape(config.voiceDesignResearchUrls || "")}</textarea>
                  <small>한 줄에 하나씩 입력하세요.</small>
                </label>
                <label class="rt-label">
                  <span>조사 메모</span>
                  <textarea id="rt-voice-research-notes" rows="3" placeholder="예: 차분하고 통제적인 말투. 부드럽지만 위압감이 있음.">${htmlEscape(config.voiceDesignResearchNotes || "")}</textarea>
                  <small>캐릭터의 설명이나 어록 메모입니다.</small>
                </label>
                <div class="rt-help-card">
                  URL이나 조사 메모를 입력하면 캡션 모델을 추가로 호출하여 자료를 정리합니다. 둘 다 비어 있으면 조사 단계는 건너뜁니다.
                </div>
              </details>
              <label class="rt-check">
                <input id="voiceDesignCharacterLine" type="checkbox" ${config.voiceDesignCharacterLine ? "checked" : ""}>
                캡션 생성 시 캐릭터풍 대사 자동 작성
              </label>
              <label class="rt-check">
                <input id="voiceDesignEmotionEmoji" type="checkbox" ${config.voiceDesignEmotionEmoji ? "checked" : ""}>
                레퍼런스 생성용 대사에 감정 이모지 허용
              </label>
              <label class="rt-label">
                <span>레퍼런스 대사 목표 글자 수</span>
                <input id="rt-voice-sample-chars" type="number" min="${VOICE_REFERENCE_SAMPLE_CHARS_MIN}" max="${VOICE_REFERENCE_SAMPLE_CHARS_MAX}" step="1" value="${htmlEscape(normalizeVoiceReferenceSampleChars(config.voiceReferenceSampleChars))}">
                <small>캡션 생성 시 자동으로 작성되는 레퍼런스 생성용 대사의 대략적인 길이입니다. 기본값 ${VOICE_REFERENCE_SAMPLE_CHARS_DEFAULT}자, 범위 ${VOICE_REFERENCE_SAMPLE_CHARS_MIN}~${VOICE_REFERENCE_SAMPLE_CHARS_MAX}자입니다.</small>
              </label>
              <div class="rt-inline-actions">
                <button id="rt-reset-caption-inputs" class="rt-button secondary" type="button">초기화</button>
                <button id="rt-generate-selected-voice" class="rt-button" type="button">보이스 디자인 캡션 생성</button>
              </div>
              <label class="rt-label">
                <span>보이스 디자인 캡션</span>
                <textarea id="rt-voice-caption" rows="4" placeholder="예: 落ち着いた若い女性の声。やわらかく、近い距離で、自然に話す。"></textarea>
              </label>
              <label class="rt-label">
                <span>레퍼런스 생성용 대사</span>
                <textarea id="rt-voice-sample-text" rows="3" placeholder="예: 😌 ねえ、少しだけそばにいてくれる？"></textarea>
                <small>보이스 레퍼런스 생성에 사용할 대사입니다. 캡션 생성 시 캐릭터풍 대사 자동 작성을 체크하면 자동으로 채워집니다.</small>
              </label>
              <label class="rt-label">
                <span>레퍼런스 생성 수</span>
                <input id="rt-voice-count" type="number" min="1" max="${MAX_VOICE_REFERENCES_PER_REQUEST}" step="1" value="${htmlEscape(config.voiceReferenceCount || DEFAULT_CONFIG.voiceReferenceCount)}">
                <small>상한 ${MAX_VOICE_REFERENCES_PER_REQUEST}. RTX 4060 기준 3~5를 권장합니다.</small>
              </label>
              <div class="rt-actions">
                <button id="rt-reset-voice-design-inputs" class="rt-button secondary" type="button">초기화</button>
                <button id="rt-generate-voice" class="rt-button" type="button">보이스 레퍼런스 생성</button>
              </div>
              <div class="rt-output-title">
                <span>레퍼런스 생성 결과</span>
                <small>보이스 디자인 캡션과 helper 처리 상태가 여기에 표시됩니다.</small>
              </div>
              <pre id="rt-voice-design-output" class="rt-output">보이스 탐색기에서 캐릭터를 선택한 뒤 생성 방향을 필요하면 적고 보이스 디자인 캡션 생성을 누르세요. 캐릭터 정보와 로어북을 읽어 캡션과 레퍼런스 생성용 대사를 채웁니다.</pre>
            </section>
          </div>

          <section class="rt-panel" style="margin-top:4px;">
            <div class="rt-step-head">
              <span class="rt-step-index">⚙</span>
              <h2>오버레이 설정 (BETA)</h2>
            </div>
            <p style="font-size:12px;color:#667085;margin:0 0 12px;">오버레이 UI의 위치와 재생 속도/볼륨을 조절합니다. PocketRisu 환경에서 일부 기능이 불안정할 수 있습니다.</p>
            <div class="rt-field-grid">
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">FAB 우측 간격 (px)
                <input id="ovl-fab-right" type="number" value="${overlayConfig.fab.right}" min="0" max="800" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
              </label>
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">FAB 하단 간격 (px)
                <input id="ovl-fab-bottom" type="number" value="${overlayConfig.fab.bottom}" min="0" max="800" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
              </label>
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">패널 우측 간격 (px)
                <input id="ovl-panel-right" type="number" value="${overlayConfig.panel.right}" min="0" max="800" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
              </label>
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">패널 상단 간격 (px)
                <input id="ovl-panel-top" type="number" value="${overlayConfig.panel.top}" min="0" max="800" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
              </label>
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">패널 너비 (px)
                <input id="ovl-panel-width" type="number" value="${overlayConfig.panel.width}" min="200" max="600" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
              </label>
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">배속 토글 목록 (쉼표로 구분)
                <input id="ovl-speeds" type="text" value="${(overlayConfig.speeds || [1, 1.25, 1.5, 1.75, 2, 2.5]).join(", ")}" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;" placeholder="1, 1.25, 1.5, 1.75, 2, 2.5">
                <small style="color:#667085;font-size:11px;">오버레이 배속 버튼을 누를 때마다 이 값들을 순서대로 순환합니다.</small>
              </label>
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">건너뛸 텍스트 필터 (쉼표로 구분)
                <input id="ovl-skip-text" type="text" value="${htmlEscape(overlayConfig.skipTextFilter || "")}" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;" placeholder="laugh, giggle, 笑う">
                <small style="color:#667085;font-size:11px;">이 텍스트가 포함된 대사는 목록에 추가되지 않고 TTS도 생성하지 않습니다. 대소문자 구분 안 함.</small>
              </label>
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">볼륨 (${overlayConfig.volume}%)
                <input id="ovl-volume" type="range" min="0" max="100" step="1" value="${overlayConfig.volume}" style="width:100%;">
              </label>
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">TTS 캐시 모드
                <select id="ovl-cachemode" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
                  <option value="off" ${overlayConfig.cacheMode === "off" ? "selected" : ""}>안함 (기본)</option>
                  <option value="auto" ${overlayConfig.cacheMode === "auto" ? "selected" : ""}>자동 (오버레이 켜져 있을 때 상단부터 순차 캐시)</option>
                  <option value="dblclick" ${overlayConfig.cacheMode === "dblclick" ? "selected" : ""}>더블클릭 (메시지 더블클릭 시 해당 메시지 캐시)</option>
                </select>
              </label>
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">스크롤 후 버튼 생성 대기 (ms)
                <input id="ovl-scroll-delay" type="number" value="${overlayConfig.scrollDelay}" min="0" max="2000" step="50" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
                <small style="color:#667085;font-size:11px;">스크롤이 멈춘 후 오버레이 스피커 버튼이 생성될 때까지 대기 시간. 낮추면 빠르지만 깜빡임 증가, 높이면 안정적. 기본 250ms.</small>
              </label>
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">스피커 버튼 크기 (px)
                <input id="ovl-button-size" type="number" value="${overlayConfig.buttonSize}" min="14" max="40" step="1" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
                <small style="color:#667085;font-size:11px;">오버레이 스피커 버튼의 크기. 기본 22px, 범위 14~40px.</small>
              </label>
              <label style="font-size:13px;display:flex;flex-direction:column;gap:4px;">스피커 버튼 활성 방식
                <select id="ovl-button-activate" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
                  <option value="click" ${overlayConfig.buttonActivate === "click" ? "selected" : ""}>클릭시 재생 (기본)</option>
                  <option value="hover" ${overlayConfig.buttonActivate === "hover" ? "selected" : ""}>오버시 재생 (클릭 불필요)</option>
                </select>
                <small style="color:#667085;font-size:11px;">오버시 재생: 마우스를 버튼 위에 올리면 곧바로 재생. 빠르게 지나가면 재생 안 됨.</small>
              </label>
              <label style="font-size:13px;display:flex;align-items:flex-start;gap:6px;">
                <input type="checkbox" id="ovl-auto-scroll-playing" ${overlayConfig.autoScrollToPlaying ? "checked" : ""} style="margin-top:3px;">
                <span><strong>재생 중 항목 자동 스크롤</strong><br><small style="color:#667085;">재생 중인 항목이 리스트에서 보이도록 자동 스크롤.</small></span>
              </label>
              <label style="font-size:13px;display:flex;align-items:flex-start;gap:6px;">
                <input type="checkbox" id="ovl-dblclick-scroll-msg" ${overlayConfig.doubleClickScrollToMessage ? "checked" : ""} style="margin-top:3px;">
                <span><strong>항목 더블클릭 → 채팅 스크롤</strong><br><small style="color:#667085;">리스트 항목 더블클릭 시 채팅창의 해당 메시지로 스크롤 이동.</small></span>
              </label>
              <label style="font-size:13px;display:flex;align-items:flex-start;gap:6px;">
                <input type="checkbox" id="ovl-selection-sync" ${overlayConfig.overlaySelectionSync ? "checked" : ""} style="margin-top:3px;">
                <span><strong>오버레이·팝업 선택 동기화</strong><br><small style="color:#667085;">스피커 버튼·리스트 항목·선택재생·방향키를 하나로 연동. 선택재생 중 다른 항목을 누르면 그 항목으로 루프가 점프하여 계속 재생되고, 선택 항목으로 리스트가 자동 스크롤됨.</small></span>
              </label>
            </div>
            <div class="rt-actions">
              <button id="rt-ovl-save" class="rt-button" type="button">오버레이 설정 저장</button>
              <button id="rt-ovl-default" class="rt-button secondary" type="button">기본값</button>
            </div>
          </section>
        </form>
      </main>
    `;
    installSettingsStyle();
    wireSettings(characterId, characterName, hasCurrentCharacter);
  }

  function field(id, label, value, hint = "") {
    return `
      <label class="rt-label">
        <span>${htmlEscape(label)}</span>
        <input id="${id}" value="${htmlEscape(value || "")}">
        ${hint ? `<small>${htmlEscape(hint)}</small>` : ""}
      </label>
    `;
  }

  function passwordField(id, label, value, hint = "") {
    return `
      <label class="rt-label">
        <span>${htmlEscape(label)}</span>
        <input id="${id}" type="password" value="${htmlEscape(value || "")}">
        ${hint ? `<small>${htmlEscape(hint)}</small>` : ""}
      </label>
    `;
  }

  function numberField(id, label, value, min, max, step, hint = "") {
    return `
      <label class="rt-label">
        <span>${htmlEscape(label)}</span>
        <input id="${id}" type="number" min="${min}" max="${max}" step="${step}" value="${htmlEscape(value)}">
        ${hint ? `<small>${htmlEscape(hint)}</small>` : ""}
      </label>
    `;
  }

  function selectField(id, label, value, options, hint = "") {
    return `
      <label class="rt-label">
        <span>${htmlEscape(label)}</span>
        <select id="${id}">
          ${options.map(([optionValue, optionLabel]) => `
            <option value="${htmlEscape(optionValue)}" ${value === optionValue ? "selected" : ""}>${htmlEscape(optionLabel)}</option>
          `).join("")}
        </select>
        ${hint ? `<small>${htmlEscape(hint)}</small>` : ""}
      </label>
    `;
  }

  function radioGroup(name, label, options, selected) {
    return `
      <fieldset class="rt-fieldset">
        <legend>${htmlEscape(label)}</legend>
        ${options.map(([value, title, hint]) => `
          <label class="rt-radio">
            <input type="radio" name="${name}" value="${htmlEscape(value)}" ${selected === value ? "checked" : ""}>
            <span><strong>${htmlEscape(title)}</strong>${hint ? `<small>${htmlEscape(hint)}</small>` : ""}</span>
          </label>
        `).join("")}
      </fieldset>
    `;
  }

  function globalParentCharacter() {
    return {
      name: GLOBAL_BOT_NAME,
      chaId: GLOBAL_BOT_ID,
      id: GLOBAL_BOT_ID,
    };
  }

  function isDefaultGlobalVoiceCharacterId(id) {
    return id === GLOBAL_NARRATION_ID || id === GLOBAL_MALE_ID || id === GLOBAL_FEMALE_ID;
  }

  function globalVoiceDefinition(id) {
    if (id === GLOBAL_MALE_ID) {
      return {
        id: GLOBAL_MALE_ID,
        name: GLOBAL_MALE_NAME,
        aliases: ["Male", "Man", "男性", "男", "남성", "남자", "남", "글로벌_남성"],
        description: "전용 보이스가 없는 남성 캐릭터의 생각, 독백, 대화를 읽는 공통 보이스입니다.",
      };
    }
    if (id === GLOBAL_FEMALE_ID) {
      return {
        id: GLOBAL_FEMALE_ID,
        name: GLOBAL_FEMALE_NAME,
        aliases: ["Female", "Woman", "女性", "女", "여성", "여자", "녀", "글로벌_여성"],
        description: "전용 보이스가 없는 여성 캐릭터의 생각, 독백, 대화를 읽는 공통 보이스입니다.",
      };
    }
    return {
      id: GLOBAL_NARRATION_ID,
      name: GLOBAL_NARRATION_NAME,
      aliases: ["Narrator", "Narration", "ナレーター", "地の文", "나레이션", "나레이터", "지문", "나레이터_지문"],
      description: "일반 지문과 성별 구분이 무의미한 화자를 읽는 공통 보이스입니다.",
    };
  }

  function globalVoiceFolderDefinition(id) {
    if (id === GLOBAL_CHARACTER_FOLDER_ID) {
      return {
        id: GLOBAL_CHARACTER_FOLDER_ID,
        name: GLOBAL_CHARACTER_FOLDER_NAME,
        description: "매칭 키가 일치하면 어느 봇에서나 사용할 수 있는 공통 캐릭터 보이스입니다.",
      };
    }
    return {
      id: GLOBAL_NARRATOR_FOLDER_ID,
      name: GLOBAL_NARRATOR_FOLDER_NAME,
      description: "지문과 전용 보이스가 없는 남성/여성 캐릭터 보이스입니다.",
    };
  }

  function globalFolderIdForCharacter(characterId) {
    return isDefaultGlobalVoiceCharacterId(characterId)
      ? GLOBAL_NARRATOR_FOLDER_ID
      : GLOBAL_CHARACTER_FOLDER_ID;
  }

  function globalVoiceReferenceSet(id = GLOBAL_NARRATION_ID, existing = null) {
    const definition = globalVoiceDefinition(id);
    const base = {
      botId: GLOBAL_BOT_ID,
      botName: GLOBAL_BOT_NAME,
      characterId: definition.id,
      characterName: definition.name,
      lorebookCharacter: false,
      characterProfile: {
        name: definition.name,
        aliases: definition.aliases,
        description: definition.description,
        voiceHints: "",
      },
      caption: "",
      sampleText: "",
      generatedAt: "",
      discoveredAt: "",
      model: "Aratako/Irodori-TTS-600M-v3-VoiceDesign",
      displayColor: defaultVoiceColorForCharacter(definition.id, definition.name),
      references: [],
      raw: null,
    };
    if (!existing) return base;

    const existingProfile = existing.characterProfile || {};
    return {
      ...base,
      ...existing,
      botId: GLOBAL_BOT_ID,
      botName: GLOBAL_BOT_NAME,
      characterId: definition.id,
      characterName: definition.name,
      lorebookCharacter: false,
      characterProfile: {
        ...base.characterProfile,
        ...existingProfile,
        name: definition.name,
        aliases: mergeAliases(base.characterProfile.aliases, existingProfile.aliases || []),
      },
      references: referenceItems(existing),
    };
  }

  function globalNarratorReferenceSet(existing = null) {
    return globalVoiceReferenceSet(GLOBAL_NARRATION_ID, existing);
  }

  function globalMaleReferenceSet(existing = null) {
    return globalVoiceReferenceSet(GLOBAL_MALE_ID, existing);
  }

  function globalFemaleReferenceSet(existing = null) {
    return globalVoiceReferenceSet(GLOBAL_FEMALE_ID, existing);
  }

  function defaultGlobalReferenceSetForId(id, existing = null) {
    if (id === GLOBAL_MALE_ID) return globalMaleReferenceSet(existing);
    if (id === GLOBAL_FEMALE_ID) return globalFemaleReferenceSet(existing);
    return globalNarratorReferenceSet(existing);
  }

  async function pruneEmptyCurrentBotDraftReferenceSet(currentCharacter) {
    if (!isRealRisuCharacter(currentCharacter)) return false;
    const currentId = getCharacterId(currentCharacter);
    const referenceSet = voiceReferencesByCharacter[currentId];
    if (!referenceSet) return false;

    const references = referenceItems(referenceSet);
    if (references.length) return false;
    if (!referenceSet.caption && !referenceSet.sampleText && !referenceSet.generatedAt) return false;

    delete voiceReferencesByCharacter[currentId];
    await saveVoiceReferences();
    return true;
  }

  function clearReferenceDraftMetadata(referenceSet) {
    return {
      ...referenceSet,
      caption: "",
      sampleText: "",
      generatedAt: "",
      raw: null,
    };
  }

  async function pruneEmptyReferenceDraftMetadata() {
    let changed = false;
    for (const [key, referenceSet] of Object.entries(voiceReferencesByCharacter || {})) {
      if (!referenceSet) continue;
      const references = referenceItems(referenceSet);
      if (references.length) continue;
      if (!referenceSet.caption && !referenceSet.sampleText && !referenceSet.generatedAt && !referenceSet.raw) continue;
      voiceReferencesByCharacter[key] = clearReferenceDraftMetadata(referenceSet);
      changed = true;
    }
    if (changed) {
      await saveVoiceReferences();
    }
    return changed;
  }

  function buildVoiceExplorerNodes(currentCharacter) {
    const hasCurrentCharacter = isRealRisuCharacter(currentCharacter);
    const currentId = hasCurrentCharacter ? getCharacterId(currentCharacter) : "";
    const currentName = hasCurrentCharacter ? (currentCharacter?.name || currentId) : "";
    const currentNameKey = normalizeLoreCandidateName(currentName).toLowerCase();
    const hiddenBotIds = new Set(Array.isArray(config.hiddenBotIds) ? config.hiddenBotIds : []);
    const botMap = new Map();
    const createGlobalFolderNode = (id) => {
      const definition = globalVoiceFolderDefinition(id);
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        locked: true,
        characters: [],
      };
    };
    const globalDefaultVoiceOrder = (id) => {
      if (id === GLOBAL_NARRATION_ID) return 1;
      if (id === GLOBAL_MALE_ID) return 2;
      if (id === GLOBAL_FEMALE_ID) return 3;
      return 99;
    };
    botMap.set(GLOBAL_BOT_ID, {
      id: GLOBAL_BOT_ID,
      name: GLOBAL_BOT_NAME,
      isGlobal: true,
      isCurrent: false,
      currentCharacter: null,
      characters: [],
      folders: [
        createGlobalFolderNode(GLOBAL_NARRATOR_FOLDER_ID),
        createGlobalFolderNode(GLOBAL_CHARACTER_FOLDER_ID),
      ],
    });
    const globalFolder = (folderId) => {
      const bot = botMap.get(GLOBAL_BOT_ID);
      let folder = bot.folders.find((item) => item.id === folderId);
      if (!folder) {
        folder = createGlobalFolderNode(folderId);
        bot.folders.push(folder);
      }
      return folder;
    };

    const addCharacter = (referenceSet, fallbackId, fallbackName, forceCurrent = false) => {
      const characterId = referenceSet?.characterId || fallbackId || currentId;
      const characterName = referenceSet?.characterName || fallbackName || characterId;
      const botId = referenceSet?.botId || (forceCurrent ? currentId : characterId);
      const botName = referenceSet?.botName || (forceCurrent ? currentName : characterName);
      if (!characterId || !botId) return;
      if (!forceCurrent && botId.toLowerCase?.() === "global") return;
      if (!botMap.has(botId)) {
        botMap.set(botId, {
          id: botId,
          name: botName,
          isGlobal: botId === GLOBAL_BOT_ID,
          isCurrent: Boolean(currentId && botId === currentId),
          currentCharacter: null,
          characters: [],
          folders: [],
        });
      }
      const bot = botMap.get(botId);
      bot.isCurrent = bot.isCurrent || Boolean(currentId && botId === currentId);
      const node = {
        id: characterId,
        name: characterName,
        isCurrent: Boolean(currentId && characterId === currentId),
        referenceSet: referenceSet || null,
      };
      const characterNameKey = normalizeLoreCandidateName(characterName).toLowerCase();
      const duplicateCurrentBotName = currentId && botId === currentId && characterNameKey && characterNameKey === currentNameKey;
      if (forceCurrent || (currentId && characterId === currentId) || duplicateCurrentBotName) {
        if (forceCurrent || (currentId && characterId === currentId) || !bot.currentCharacter?.referenceSet) {
          bot.currentCharacter = node;
        }
        return;
      }
      if (bot.isGlobal) {
        globalFolder(globalFolderIdForCharacter(characterId)).characters.push(node);
        return;
      }
      bot.characters.push(node);
    };

    addCharacter(globalNarratorReferenceSet(voiceReferencesByCharacter[GLOBAL_NARRATION_ID]), GLOBAL_NARRATION_ID, GLOBAL_NARRATION_NAME, false);
    addCharacter(globalMaleReferenceSet(voiceReferencesByCharacter[GLOBAL_MALE_ID]), GLOBAL_MALE_ID, GLOBAL_MALE_NAME, false);
    addCharacter(globalFemaleReferenceSet(voiceReferencesByCharacter[GLOBAL_FEMALE_ID]), GLOBAL_FEMALE_ID, GLOBAL_FEMALE_NAME, false);
    if (hasCurrentCharacter && (!hiddenBotIds.has(currentId) || voiceReferencesByCharacter[currentId])) {
      addCharacter(voiceReferencesByCharacter[currentId], currentId, currentName, true);
    }
    for (const [id, referenceSet] of Object.entries(voiceReferencesByCharacter)) {
      if ((currentId && id === currentId) || isDefaultGlobalVoiceCharacterId(id) || id.toLowerCase?.() === "global") continue;
      addCharacter(referenceSet, id, referenceSet?.characterName || id, false);
    }

    const nodes = Array.from(botMap.values());
    nodes.sort((a, b) => Number(b.isGlobal) - Number(a.isGlobal) || Number(b.isCurrent) - Number(a.isCurrent) || a.name.localeCompare(b.name));
    for (const node of nodes) {
      node.characters.sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || a.name.localeCompare(b.name));
      node.folders?.forEach((folder) => {
        folder.characters.sort((a, b) => globalDefaultVoiceOrder(a.id) - globalDefaultVoiceOrder(b.id) || a.name.localeCompare(b.name));
      });
    }
    return nodes;
  }

  function hasVisibleCurrentBotAssets(bot) {
    const referenceSet = bot?.currentCharacter?.referenceSet || null;
    const references = referenceItems(referenceSet);
    return references.length > 0;
  }

  function visibleBotCharacterCount(bot) {
    const folderCharacters = (bot?.folders || []).reduce((sum, folder) => sum + (folder?.characters?.length || 0), 0);
    return (bot?.characters?.length || 0) + folderCharacters + (hasVisibleCurrentBotAssets(bot) ? 1 : 0);
  }

  function botMetaText(bot) {
    const count = visibleBotCharacterCount(bot);
    if (bot.isGlobal) return `공통 / ${count}명${config.globalNarrationEnabled ? " / 활성" : ""}`;
    return bot.isCurrent ? `현재 봇 / ${count}명` : `${count}명`;
  }

  function botCharacterCount(bot) {
    return visibleBotCharacterCount(bot);
  }

  function renderVoiceExplorer(currentCharacter, activeCharacterId = "", activeBotId = "") {
    const nodes = buildVoiceExplorerNodes(currentCharacter);
    const currentId = getCharacterId(currentCharacter);
    const activeId = activeCharacterId || currentId;
    const selectedBotId = activeBotId || currentId;
    if (!nodes.length) {
      return '<div class="rt-voice-explorer"><p class="rt-muted">아직 저장된 보이스 레퍼런스가 없습니다.</p></div>';
    }

    return `
      <div id="rt-voice-explorer" class="rt-voice-explorer">
        ${nodes.map((bot) => `
          <details class="rt-tree-bot ${bot.id === selectedBotId ? "active" : ""}" ${(bot.isGlobal || bot.isCurrent || bot.id === selectedBotId) ? "open" : ""} data-bot-id="${htmlEscape(bot.id)}" data-bot-name="${htmlEscape(bot.name)}" data-character-count="${botCharacterCount(bot)}" data-default-character-id="${htmlEscape(bot.isGlobal ? GLOBAL_NARRATION_ID : bot.id)}" data-current-character-id="${bot.isCurrent ? htmlEscape(currentId) : ""}">
            <summary><span class="rt-tree-icon">▸</span><span class="rt-tree-name">${htmlEscape(bot.name)}</span><span class="rt-tree-meta">${htmlEscape(botMetaText(bot))}</span><button class="rt-button secondary rt-folder-select-all rt-icon-button" type="button" title="이 봇 캐릭터 전체 선택" aria-label="이 봇 캐릭터 전체 선택" data-folder-scope="${htmlEscape(bot.id)}" data-action="select">&#9745;</button><button class="rt-button secondary rt-folder-select-all rt-icon-button" type="button" title="이 봇 캐릭터 전체 해제" aria-label="이 봇 캐릭터 전체 해제" data-folder-scope="${htmlEscape(bot.id)}" data-action="deselect">&#9744;</button>${(!bot.isGlobal) ? `<button class="rt-button secondary danger rt-delete-bot rt-icon-button" type="button" title="봇 폴더 삭제" aria-label="봇 폴더 삭제" data-bot-id="${htmlEscape(bot.id)}" data-bot-name="${htmlEscape(bot.name)}" data-character-count="${botCharacterCount(bot)}" data-is-current="${bot.isCurrent ? "1" : "0"}">&#128465;</button>` : ""}</summary>
            <div class="rt-tree-children">
              ${bot.currentCharacter ? renderCurrentBotAssets(bot.currentCharacter, activeId) : ""}
              ${(bot.folders || []).map((folder) => renderExplorerFolder(folder, currentId, activeId)).join("")}
              ${bot.characters.map((item) => renderExplorerCharacter(item, currentId, activeId)).join("")}
            </div>
          </details>
        `).join("")}
      </div>
    `;
  }

  function renderExplorerFolder(folder, currentId, activeCharacterId) {
    const characters = Array.isArray(folder?.characters) ? folder.characters : [];
    const countText = `${characters.length}명 / 삭제 불가`;
    const isNarratorFolder = folder?.id === GLOBAL_NARRATOR_FOLDER_ID;
    return `
      <details class="rt-tree-folder" open data-folder-id="${htmlEscape(folder?.id || "")}" data-locked="1">
        <summary><span class="rt-tree-icon">${isNarratorFolder ? "▾" : "▸"}</span><span class="rt-tree-name">${htmlEscape(folder?.name || "폴더")}</span><span class="rt-tree-meta">${htmlEscape(countText)}</span><button class="rt-button secondary rt-folder-select-all rt-icon-button" type="button" title="이 폴더 캐릭터 전체 선택" aria-label="이 폴더 캐릭터 전체 선택" data-folder-scope="${htmlEscape(folder?.id || "")}" data-action="select">&#9745;</button><button class="rt-button secondary rt-folder-select-all rt-icon-button" type="button" title="이 폴더 캐릭터 전체 해제" aria-label="이 폴더 캐릭터 전체 해제" data-folder-scope="${htmlEscape(folder?.id || "")}" data-action="deselect">&#9744;</button></summary>
        <div class="rt-tree-children">
          ${folder?.description ? `<p class="rt-tree-folder-note">${htmlEscape(folder.description)}</p>` : ""}
          ${characters.length ? characters.map((item) => renderExplorerCharacter(item, currentId, activeCharacterId)).join("") : '<div class="rt-tree-empty">아직 등록된 글로벌 캐릭터가 없습니다.</div>'}
        </div>
      </details>
    `;
  }

  function hiddenBotEntries() {
    const ids = Array.isArray(config.hiddenBotIds) ? config.hiddenBotIds : [];
    const names = config.hiddenBotNames && typeof config.hiddenBotNames === "object" ? config.hiddenBotNames : {};
    return ids
      .map((id) => {
        const safeId = String(id || "").trim();
        return safeId
          ? {
              id: safeId,
              name: String(names[safeId] || safeId).trim() || safeId,
            }
          : null;
      })
      .filter(Boolean);
  }

  function renderHiddenBotManager() {
    const entries = hiddenBotEntries();
    return `
      <details id="rt-hidden-bot-manager" class="rt-hidden-bots">
        <summary>
          <span>숨겨진 봇 목록</span>
          <span class="rt-tree-meta">${entries.length}개</span>
        </summary>
        <div class="rt-hidden-bot-list">
          ${entries.length ? entries.map((entry) => `
            <div class="rt-hidden-bot-row">
              <div>
                <strong>${htmlEscape(entry.name)}</strong>
                <small>${htmlEscape(entry.id)}</small>
              </div>
              <button class="rt-button secondary rt-restore-hidden-bot" type="button" data-bot-id="${htmlEscape(entry.id)}">복원</button>
            </div>
          `).join("") : '<p class="rt-muted">숨겨진 봇 폴더가 없습니다.</p>'}
        </div>
      </details>
    `;
  }

  function renderVoiceFileMaintenance() {
    const unregistered = Array.isArray(unregisteredVoiceFilesForExplorer) ? unregisteredVoiceFilesForExplorer : [];
    return `
      <div id="rt-voice-maintenance" class="rt-voice-maintenance">
        <div class="rt-voice-maintenance-head">
          <strong>레퍼런스 정리</strong>
          <small>기록과 실제 wav 파일을 비교합니다. 미등록 wav는 들어본 뒤 원하는 캐릭터 줄로 옮기세요.</small>
        </div>
        <div class="rt-voice-maintenance-actions">
          <button id="rt-audit-voice-files" class="rt-button secondary" type="button">새로고침</button>
        </div>
        <details class="rt-unregistered-references" ${unregisteredReferencesOpen ? "open" : ""}>
          <summary class="rt-unregistered-title">
            <span class="rt-unregistered-fold-icon">▸</span>
            <label class="rt-unregistered-check-all">
              <input id="rt-unregistered-select-all" type="checkbox" ${unregistered.length ? "" : "disabled"}>
              <span>미등록 레퍼런스</span>
            </label>
            <span class="rt-tree-meta">${unregistered.length}개</span>
            <button id="rt-delete-selected-unregistered" class="rt-button secondary danger rt-icon-button" type="button" title="선택한 미등록 레퍼런스 삭제" aria-label="선택한 미등록 레퍼런스 삭제" ${unregistered.length ? "" : "disabled"}>&#128465;</button>
          </summary>
          ${unregistered.length ? `
            <div class="rt-unregistered-list">
              ${unregistered.map((voice) => renderUnregisteredVoiceFile(voice)).join("")}
            </div>
          ` : '<p class="rt-muted">voices 폴더에만 남아 있는 미등록 wav가 없습니다.</p>'}
        </details>
      </div>
    `;
  }

  function renderUnregisteredVoiceFile(voice) {
    const voiceId = String(voice?.voiceId || "").trim();
    const label = String(voice?.label || voiceId || "미등록 레퍼런스").trim();
    const file = String(voice?.file || "").trim();
    const previewUrl = String(voice?.previewUrl || helperAudioUrlForVoice(voiceId)).trim();
    return `
      <div class="rt-unregistered-voice" data-voice-id="${htmlEscape(voiceId)}" data-label="${htmlEscape(label)}" data-file="${htmlEscape(file)}" data-preview-url="${htmlEscape(previewUrl)}">
        <div class="rt-tree-reference-main">
          <input class="rt-unregistered-select" type="checkbox" title="미등록 레퍼런스 선택" aria-label="미등록 레퍼런스 선택" data-voice-id="${htmlEscape(voiceId)}" ${voiceId ? "" : "disabled"}>
          <button class="rt-button secondary rt-move-unregistered-voice rt-icon-button" type="button" title="캐릭터로 이동" aria-label="캐릭터로 이동" data-voice-id="${htmlEscape(voiceId)}" ${voiceId ? "" : "disabled"}>↕</button>
          <div>
            <strong>${htmlEscape(label)}</strong>
            ${file ? `<small>${htmlEscape(file)}</small>` : ""}
          </div>
        </div>
        <div class="rt-tree-actions">
          <button class="rt-button secondary rt-play-explorer-voice rt-icon-button" type="button" title="미등록 레퍼런스 듣기" aria-label="미등록 레퍼런스 듣기" data-voice-id="${htmlEscape(voiceId)}" data-preview-url="${htmlEscape(previewUrl)}" data-sample-text="" ${voiceId ? "" : "disabled"}>&#128266;</button>
          <button class="rt-button secondary danger rt-delete-unregistered-voice rt-icon-button" type="button" title="미등록 레퍼런스 삭제" aria-label="미등록 레퍼런스 삭제" data-voice-id="${htmlEscape(voiceId)}" ${voiceId ? "" : "disabled"}>&#128465;</button>
        </div>
      </div>
    `;
  }

  function renderCurrentBotAssets(item, activeCharacterId) {
    const referenceSet = item.referenceSet || {};
    const references = referenceItems(referenceSet);
    const selectedForCharacter = config.voiceByCharacter[item.id] || "";
    if (!references.length) return "";
    return `
      <div class="rt-tree-references rt-tree-current-references ${item.id === activeCharacterId ? "active" : ""}">
        ${references.map((reference, index) => renderExplorerReference(item, reference, index, selectedForCharacter)).join("")}
      </div>
    `;
  }

  function renderExplorerCharacter(item, currentId, activeCharacterId) {
    const referenceSet = item.referenceSet || {};
    const references = referenceItems(referenceSet);
    const selectedForCharacter = config.voiceByCharacter[item.id] || "";
    const active = item.id === activeCharacterId;
    const matchKeys = matchKeyInputValue(referenceSet, item.name);
    const characterColor = characterColorFromReferenceSet(referenceSet, item.id, item.name);
    const colorAction = `<button class="rt-button secondary rt-color-character rt-icon-button" type="button" title="캐릭터 색상 선택" aria-label="캐릭터 색상 선택" data-character-id="${htmlEscape(item.id)}" data-character-name="${htmlEscape(item.name)}" data-current-color="${htmlEscape(characterColor)}">${voiceColorDot(characterColor)}</button>`;
    const canDeleteCharacter = Boolean(referenceSet.lorebookCharacter && !item.isCurrent);
    const characterActions = canDeleteCharacter
      ? `<button class="rt-button secondary rt-rename-lorebook-character rt-icon-button" type="button" title="캐릭터 이름 변경" aria-label="캐릭터 이름 변경" data-character-id="${htmlEscape(item.id)}">&#9998;</button><button class="rt-button secondary danger rt-delete-lorebook-character rt-icon-button" type="button" title="캐릭터 항목 삭제" aria-label="캐릭터 항목 삭제" data-character-id="${htmlEscape(item.id)}">&#128465;</button>`
      : "";
    return `
      <details class="rt-tree-character ${active ? "active" : ""}" data-character-id="${htmlEscape(item.id)}" data-character-name="${htmlEscape(item.name)}" data-can-delete="${canDeleteCharacter ? "1" : "0"}" ${item.isCurrent || active ? "open" : ""}>
        <summary><input class="rt-character-select" type="checkbox" title="이 캐릭터의 레퍼런스 전체 선택" aria-label="이 캐릭터의 레퍼런스 전체 선택" data-character-id="${htmlEscape(item.id)}" ${(references.length || canDeleteCharacter) ? "" : "disabled"}><span class="rt-tree-icon">└</span><span class="rt-tree-name">${htmlEscape(item.name)}</span><span class="rt-tree-meta">${selectedForCharacter ? htmlEscape(selectedForCharacter) : "미선택"}</span>${colorAction}${characterActions}</summary>
        <div class="rt-tree-references">
          <label class="rt-match-key-row">
            <span>매칭 키</span>
            <input class="rt-match-keys-input" type="text" data-character-id="${htmlEscape(item.id)}" value="${htmlEscape(matchKeys)}" placeholder="예: 마키마, Makima, マキマ">
            <small>실제 RP에서 화자명으로 나올 수 있는 표기를 쉼표로 구분합니다.</small>
          </label>
          ${references.length ? references.map((reference, index) => renderExplorerReference(item, reference, index, selectedForCharacter)).join("") : `
            <div class="rt-tree-empty">아직 보이스 레퍼런스가 없습니다. 이 캐릭터를 선택한 뒤 보이스 디자인 캡션 생성 버튼을 사용하세요.</div>
          `}
        </div>
      </details>
    `;
  }

  function renderExplorerReference(item, reference, index, selectedVoice) {
    const voiceId = reference.voiceId || "";
    const label = reference.label || voiceId || `보이스_${index + 1}`;
    const detail = reference.file || reference.url || (reference.seed ? `seed ${reference.seed}` : "");
    const selected = voiceId && voiceId === selectedVoice;
    const locked = Boolean(reference.locked);
    const missing = Boolean(reference.fileMissing);
    const previewUrl = reference.previewUrl || helperAudioUrlForVoice(voiceId);
    const previewSampleText = cleanVoiceDesignSampleText(reference.sampleText || item.sampleText || "");
    const canPreview = Boolean(voiceId && !missing);
    return `
      <div class="rt-tree-reference ${selected ? "selected" : ""} ${locked ? "locked" : ""} ${missing ? "missing" : ""}" data-character-id="${htmlEscape(item.id)}" data-character-name="${htmlEscape(item.name)}" data-reference-index="${index}" data-voice-id="${htmlEscape(voiceId)}" data-locked="${locked ? "1" : "0"}">
        <div class="rt-tree-reference-main">
          <input class="rt-reference-select" type="checkbox" title="레퍼런스 선택" aria-label="레퍼런스 선택" data-character-id="${htmlEscape(item.id)}" data-reference-index="${index}" data-voice-id="${htmlEscape(voiceId)}" ${voiceId ? "" : "disabled"}>
          <button class="rt-button secondary rt-move-explorer-voice rt-icon-button" type="button" title="레퍼런스 이동" aria-label="레퍼런스 이동" data-character-id="${htmlEscape(item.id)}" data-reference-index="${index}" data-voice-id="${htmlEscape(voiceId)}" ${voiceId ? "" : "disabled"}>↕</button>
          <div>
            <strong>${htmlEscape(label)}${missing ? ' <span class="rt-missing-badge">파일 없음</span>' : ""}</strong>
            ${detail ? `<small>${htmlEscape(detail)}</small>` : ""}
          </div>
        </div>
        <div class="rt-tree-actions">
          <button class="rt-button secondary rt-play-explorer-voice rt-icon-button ${missing ? "muted" : ""}" type="button" title="${missing ? "wav 파일 없음" : "레퍼런스 듣기"}" aria-label="${missing ? "wav 파일 없음" : "레퍼런스 듣기"}" data-voice-id="${htmlEscape(voiceId)}" data-preview-url="${htmlEscape(previewUrl)}" data-sample-text="${htmlEscape(previewSampleText)}" ${canPreview ? "" : "disabled"}>${missing ? "&#128263;" : "&#128266;"}</button>
          <button class="rt-button secondary rt-rename-explorer-voice rt-icon-button" type="button" title="이름 변경" aria-label="이름 변경" data-character-id="${htmlEscape(item.id)}" data-reference-index="${index}" data-voice-id="${htmlEscape(voiceId)}" ${voiceId ? "" : "disabled"}>&#9998;</button>
          <button class="rt-button secondary rt-use-explorer-voice" type="button" data-character-id="${htmlEscape(item.id)}" data-voice-id="${htmlEscape(voiceId)}" ${canPreview ? "" : "disabled"}>${missing ? "사용 불가" : (selected ? "사용 중" : "사용")}</button>
          <button class="rt-button secondary rt-lock-explorer-voice rt-icon-button ${locked ? "active" : ""}" type="button" title="${locked ? "삭제 잠금 해제" : "삭제 잠금"}" aria-label="${locked ? "삭제 잠금 해제" : "삭제 잠금"}" data-character-id="${htmlEscape(item.id)}" data-reference-index="${index}" data-voice-id="${htmlEscape(voiceId)}" ${voiceId ? "" : "disabled"}>${locked ? "&#128274;" : "&#128275;"}</button>
          <button class="rt-button secondary danger rt-delete-explorer-voice rt-icon-button" type="button" title="레퍼런스 삭제" aria-label="레퍼런스 삭제" data-character-id="${htmlEscape(item.id)}" data-reference-index="${index}" data-voice-id="${htmlEscape(voiceId)}" ${voiceId ? "" : "disabled"}>&#128465;</button>
        </div>
      </div>
    `;
  }

  function referenceStatusText(title, referenceSet) {
    const references = referenceItems(referenceSet);
    return [
      title,
      `봇: ${referenceSet?.botName || referenceSet?.characterName || ""}`,
      `캐릭터: ${referenceSet?.characterName || ""}`,
      `레퍼런스 수: ${references.length}`,
      referenceSet?.caption ? `보이스 디자인 캡션: ${referenceSet.caption}` : "",
      referenceSet?.sampleText ? `대사: ${referenceSet.sampleText}` : "",
      "",
      references.map((reference, index) => {
        const voiceId = reference.voiceId || "(voiceId 없음)";
        const detail = reference.file || reference.url || reference.seed || "";
        return `${index + 1}. ${reference.label || voiceId} / ${voiceId}${detail ? ` / ${detail}` : ""}`;
      }).join("\n"),
    ].filter(Boolean).join("\n");
  }

  function voiceDesignFailureText(title, error) {
    const rawMessage = String(error?.message || error || "알 수 없는 오류");
    const message = rawMessage.trim() === "{}"
      ? "상세 오류가 전달되지 않았습니다. start-risutts.cmd 창의 Helper 로그를 확인하세요."
      : rawMessage;
    const endpoint = config.ttsModelEndpoint || DEFAULT_CONFIG.ttsModelEndpoint;
    return [
      title,
      message,
      "",
      "보이스 레퍼런스 Helper가 켜져 있는지 확인하세요.",
      `TTS 모델 엔드포인트: ${endpoint}`,
      "",
      "가장 쉬운 방법은 RisuTTS 폴더의 start-risutts.cmd를 실행해 TTS 서버와 helper를 함께 켜는 것입니다.",
      "실행 후 같은 버튼을 다시 누르면, 생성된 레퍼런스가 보이스 탐색기에 자동으로 등록됩니다.",
      "```powershell",
      "Set-Location <RisuTTS 폴더>",
      ".\\start-risutts.cmd",
      "```",
    ].join("\n");
  }

  function installSettingsStyle() {
    const style = document.createElement("style");
    style.textContent = `
      :root { color-scheme: light dark; }
      body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .rt-page { min-height: 100vh; box-sizing: border-box; padding: 16px 14px; color: #1f2937; background: #f6f7f9; }
      .rt-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; width: 100%; margin: 0 0 18px; }
      .rt-header-actions { display: flex; justify-content: flex-end; gap: 8px; align-items: center; }
      h1 { margin: 0 0 6px; font-size: 28px; letter-spacing: 0; }
      h2 { margin: 22px 0 12px; font-size: 16px; letter-spacing: 0; }
      p { margin: 0; }
      .rt-layout { display: grid; grid-template-columns: minmax(0, 0.70fr) minmax(0, 1.30fr) minmax(0, 1.00fr); gap: 14px; width: 100%; max-width: none; margin: 0; align-items: start; }
      .rt-sidebar, .rt-explorer-column, .rt-reference-column { display: grid; gap: 14px; align-content: start; min-width: 0; max-width: 100%; }
      .rt-panel { background: #fff; border: 1px solid #d9dee7; border-radius: 8px; padding: 18px; box-sizing: border-box; min-width: 0; max-width: 100%; overflow-x: hidden; }
      .rt-step-head { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; }
      .rt-step-head h2 { margin: 0; }
      .rt-step-index { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 999px; background: #2563eb; color: #fff; font-weight: 800; }
      .rt-field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 12px; min-width: 0; }
      .rt-label { display: grid; gap: 6px; margin-bottom: 12px; font-size: 13px; font-weight: 650; min-width: 0; }
      .rt-field-grid .rt-label { margin-bottom: 0; }
      .rt-label small, .rt-muted { color: #667085; font-weight: 400; }
      input, textarea, select { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 6px; padding: 9px 10px; font: inherit; background: #fff; color: #111827; }
      textarea { resize: vertical; }
      .rt-check { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; line-height: 1.55; }
      .rt-check input { width: auto; }
      .rt-help { margin: -6px 0 12px 24px; color: #667085; font-size: 12px; line-height: 1.55; }
      .rt-info-note { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 8px; align-items: start; margin: 10px 0 12px; padding: 9px 10px; border: 1px solid #dbe7ff; border-radius: 7px; background: #f7faff; color: #475569; font-size: 12px; line-height: 1.55; }
      .rt-info-note strong { color: #1d4ed8; font-weight: 750; }
      .rt-info-mark { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 800; line-height: 1; }
      .rt-help-card { margin: 8px 0 0; padding: 9px 10px; border: 1px solid #e5eaf2; border-radius: 7px; background: #f8fafc; color: #667085; font-size: 12px; line-height: 1.6; }
      .rt-option-card { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: start; margin: 12px 0; padding: 10px 12px; border: 1px solid #e5eaf2; border-radius: 8px; background: #fff; line-height: 1.55; }
      .rt-option-card input { width: auto; margin-top: 3px; }
      .rt-option-card strong { display: block; font-size: 14px; line-height: 1.4; }
      .rt-option-card small { display: block; margin-top: 4px; color: #667085; font-size: 12px; font-weight: 400; line-height: 1.65; }
      .rt-warning-note { display: block; grid-column: 1 / -1; margin: 2px 0 10px; padding: 9px 10px; border: 1px solid #fed7aa; border-radius: 6px; background: #fff7ed; color: #9a3412; font-size: 12px; line-height: 1.6; }
      .rt-global-toggle { margin: 10px 0; color: #475569; }
      .rt-fieldset { border: 1px solid #d9dee7; border-radius: 8px; padding: 10px 12px; margin: 0 0 12px; }
      .rt-fieldset legend { padding: 0 6px; font-size: 13px; font-weight: 650; }
      .rt-radio { display: flex; align-items: flex-start; gap: 8px; margin: 8px 0; font-size: 13px; }
      .rt-radio input { width: auto; margin-top: 3px; }
      .rt-radio small { display: block; color: #667085; font-weight: 400; margin-top: 2px; }
      .rt-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      .rt-debug-request-block { display: grid; gap: 8px; }
      .rt-debug-request-block .rt-label { margin-bottom: 0; }
      .rt-debug-request-actions { display: flex; justify-content: flex-start; gap: 8px; }
      .rt-inline-actions { display: flex; justify-content: flex-start; gap: 8px; margin: -4px 0 12px; }
      .rt-batch-ops { margin: 0 0 14px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; }
      .rt-batch-ops > summary { font-size: 13px; font-weight: 650; cursor: pointer; color: #1e3a8a; }
      .rt-batch-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 8px; }
      .rt-batch-actions .rt-button { font-size: 12px; padding: 6px 12px; }
      .rt-batch-progress { display: flex; align-items: center; gap: 8px; margin: 8px 0; font-size: 12px; color: #475569; }
      .rt-batch-progress-bar { flex: 1; min-width: 80px; height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
      .rt-batch-progress-bar > div { height: 100%; background: linear-gradient(90deg, #2563eb, #4f46e5); border-radius: 999px; transition: width 200ms ease; width: 0%; }
      .rt-batch-progress[hidden] { display: none !important; }
      .rt-batch-hint { margin: 6px 0 0; font-size: 11px; line-height: 1.5; }
      .rt-batch-progress:not([hidden]) { cursor: pointer; }
      .rt-batch-progress:not([hidden]):hover .rt-batch-progress-bar > div { background: linear-gradient(90deg, #dc2626, #ea580c); }
      .rt-tree-character.batch-selected > summary { background: #eff6ff !important; border-color: #93c5fd !important; }
      .rt-tree-character.batch-selected > summary .rt-tree-name { font-weight: 700; color: #1e40af; }
      .rt-prompt-preset-actions { display: flex; justify-content: flex-start; gap: 8px; margin: -4px 0 12px; }
      .rt-button { border: 1px solid #2563eb; background: #2563eb; color: #fff; border-radius: 6px; padding: 8px 12px; font: inherit; cursor: pointer; }
      .rt-button.secondary { border-color: #cbd5e1; background: #fff; color: #1f2937; }
      .rt-button.danger { border-color: #fecaca; color: #b91c1c; background: #fff; }
      .rt-button.danger:hover { background: #fef2f2; }
      .rt-button:disabled, .rt-button.rt-busy-disabled { opacity: 0.55; cursor: not-allowed; }
      .rt-play-explorer-voice.playing { border-color: #ef4444; color: #b91c1c; background: #fff1f2; }
      .rt-play-explorer-voice.muted { color: #64748b; background: #f8fafc; }
      .rt-fold { margin-top: 12px; border: 1px solid #d9dee7; border-radius: 8px; padding: 0 12px 12px; background: #fbfdff; overflow: hidden; }
      .rt-fold summary { margin: 0 -12px; padding: 12px; font-weight: 750; color: #1f2937; line-height: 1.35; cursor: pointer; }
      .rt-fold[open] summary { margin-bottom: 12px; border-bottom: 1px solid #e5eaf2; background: #f8fafc; }
      .rt-fold .rt-field-grid { margin-top: 12px; }
      .rt-sub-details { margin: 0 0 12px; border: 1px solid #e5eaf2; border-radius: 8px; background: #fbfdff; padding: 0 12px 12px; }
      .rt-sub-details summary { margin: 0 -12px 0; padding: 10px 12px; cursor: pointer; font-weight: 750; color: #334155; line-height: 1.45; }
      .rt-sub-details[open] summary { margin-bottom: 12px; border-bottom: 1px solid #e5eaf2; background: #f8fafc; }
      .rt-icon-button { width: 42px; min-width: 42px; padding: 8px 0; text-align: center; }
      .rt-color-dot { display: inline-block; width: 14px; height: 14px; border-radius: 999px; box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.16); vertical-align: middle; }
      .rt-color-character .rt-color-dot { width: 16px; height: 16px; }
      .rt-color-swatch-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
      .rt-color-swatch { display: flex; align-items: center; gap: 8px; justify-content: flex-start; min-height: 42px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #1f2937; font: inherit; cursor: pointer; }
      .rt-color-swatch:hover { border-color: #2563eb; background: #f8fbff; }
      .rt-color-swatch.selected { border-color: #2563eb; background: #eef3ff; color: #1d4ed8; font-weight: 750; }
      .rt-output-title { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; margin-top: 14px; margin-bottom: 6px; font-size: 13px; font-weight: 750; }
      .rt-output-title small { color: #667085; font-weight: 400; }
      .rt-output { min-height: 42px; max-width: 100%; min-width: 0; white-space: pre-wrap; overflow: auto; overflow-wrap: anywhere; word-break: break-word; padding: 10px; border-radius: 6px; background: #111827; color: #f8fafc; font-size: 12px; }
      .rt-voice-explorer { min-height: 470px; max-height: 620px; min-width: 0; max-width: 100%; overflow: auto; border: 1px solid #d9dee7; border-radius: 8px; background: #fbfdff; padding: 8px; }
      .rt-hidden-bots { margin-top: 10px; border: 1px solid #d9dee7; border-radius: 8px; background: #fbfdff; overflow: hidden; }
      .rt-hidden-bots > summary { list-style: none; display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; font-weight: 750; color: #334155; }
      .rt-hidden-bots[open] > summary { border-bottom: 1px solid #e5eaf2; background: #f8fafc; }
      .rt-hidden-bot-list { display: grid; gap: 8px; padding: 10px 12px; }
      .rt-hidden-bot-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 10px; border: 1px solid #e5eaf2; border-radius: 6px; background: #fff; }
      .rt-hidden-bot-row strong, .rt-hidden-bot-row small { display: block; min-width: 0; overflow-wrap: anywhere; }
      .rt-hidden-bot-row small { margin-top: 2px; color: #667085; font-size: 12px; }
      .rt-voice-maintenance { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; margin-top: 10px; padding: 10px 12px; border: 1px solid #d9dee7; border-radius: 8px; background: #fbfdff; }
      .rt-voice-maintenance strong, .rt-voice-maintenance small { display: block; min-width: 0; overflow-wrap: anywhere; }
      .rt-voice-maintenance small { margin-top: 2px; color: #667085; font-size: 12px; line-height: 1.5; }
      .rt-voice-maintenance-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
      .rt-unregistered-references { grid-column: 1 / -1; padding-top: 8px; border-top: 1px solid #e5eaf2; }
      .rt-unregistered-title { list-style: none; display: flex; align-items: center; gap: 8px; min-height: 38px; font-size: 13px; font-weight: 750; color: #334155; cursor: pointer; }
      .rt-unregistered-title::-webkit-details-marker { display: none; }
      .rt-unregistered-fold-icon { color: #64748b; transition: transform 120ms ease; }
      .rt-unregistered-references[open] .rt-unregistered-fold-icon { transform: rotate(90deg); }
      .rt-unregistered-check-all { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
      .rt-unregistered-check-all input { flex: 0 0 24px; width: 24px; height: 24px; margin: 0; accent-color: #2563eb; cursor: pointer; }
      .rt-unregistered-list { display: grid; gap: 6px; padding-top: 8px; }
      .rt-unregistered-voice { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 8px 10px; border: 1px dashed #cbd5e1; border-radius: 6px; background: #fff; }
      .rt-unregistered-voice.dragging { opacity: 0.72; border-color: #38bdf8; background: #ecfeff; }
      .rt-unregistered-voice strong, .rt-unregistered-voice small { display: block; min-width: 0; overflow-wrap: anywhere; }
      .rt-unregistered-voice small { margin-top: 3px; color: #667085; font-size: 12px; }
      .rt-tree-bot, .rt-tree-folder, .rt-tree-character { border-radius: 6px; }
      .rt-tree-bot > summary, .rt-tree-folder > summary, .rt-tree-character > summary { list-style: none; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; font-weight: 750; }
      .rt-tree-bot > summary::-webkit-details-marker, .rt-tree-folder > summary::-webkit-details-marker, .rt-tree-character > summary::-webkit-details-marker { display: none; }
      .rt-tree-bot > summary { background: #eef3fb; color: #1f3f7a; }
      .rt-tree-folder > summary { background: #f8fafc; color: #334155; border: 1px dashed #cbd5e1; }
      .rt-tree-character > summary { background: #fff; color: #1f2937; border: 1px solid #e5eaf2; }
      .rt-tree-bot.active > summary, .rt-tree-character.active > summary { border-color: #2563eb; background: #eef3ff; color: #1d4ed8; }
      .rt-tree-bot > summary .rt-icon-button, .rt-tree-folder > summary .rt-icon-button, .rt-tree-character > summary .rt-icon-button { margin-left: 4px; }
      .rt-tree-children { margin: 7px 0 7px 16px; padding-left: 12px; border-left: 1px solid #d9dee7; }
      .rt-tree-references { margin: 6px 0 10px 18px; display: grid; gap: 6px; }
      .rt-tree-reference { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #e5eaf2; border-radius: 6px; background: #fff; }
      .rt-tree-reference-main { min-width: 0; display: flex; align-items: center; gap: 8px; }
      .rt-tree-reference-main > div { min-width: 0; }
      .rt-reference-select, .rt-character-select, .rt-unregistered-select { flex: 0 0 24px; width: 24px; height: 24px; margin: 0; padding: 0; cursor: pointer; accent-color: #2563eb; }
      .rt-character-select:disabled { cursor: default; opacity: 0.45; }
      .rt-move-explorer-voice, .rt-move-unregistered-voice { cursor: grab; }
      .rt-tree-reference.dragging { opacity: 0.72; }
      .rt-tree-reference.dragging .rt-move-explorer-voice, .rt-unregistered-voice.dragging .rt-move-unregistered-voice { cursor: grabbing; border-color: #38bdf8; background: #ecfeff; }
      .rt-tree-reference.locked { border-style: dashed; }
      .rt-tree-reference.missing { border-color: #cbd5e1; background: #f3f4f6; color: #64748b; }
      .rt-tree-reference.missing small { color: #94a3b8; }
      .rt-tree-reference.missing .rt-tree-actions .rt-button:not(.danger) { color: #64748b; background: #f8fafc; border-color: #cbd5e1; }
      .rt-missing-badge { display: inline-flex; align-items: center; margin-left: 6px; padding: 2px 6px; border-radius: 999px; background: #e2e8f0; color: #475569; font-size: 11px; font-weight: 800; vertical-align: middle; }
      .rt-lock-explorer-voice.active { border-color: #f59e0b; color: #92400e; background: #fffbeb; }
      .rt-tree-reference.selected { border-color: #2563eb; background: #eef3ff; }
      .rt-drop-target > summary { outline: 2px solid #38bdf8; outline-offset: 2px; background: #e0f2fe !important; }
      .rt-tree-actions { display: flex; gap: 8px; align-items: center; }
      .rt-tree-reference small, .rt-tree-caption, .rt-tree-empty { display: block; color: #667085; font-size: 12px; margin-top: 3px; }
      .rt-tree-caption { padding: 6px 8px; background: #f6f7f9; border-radius: 6px; }
      .rt-tree-folder-note { margin: 0 0 8px; color: #667085; font-size: 12px; line-height: 1.5; }
      .rt-match-key-row { display: grid; gap: 5px; padding: 8px 10px; border: 1px solid #e5eaf2; border-radius: 6px; background: #f8fafc; color: #334155; font-size: 12px; font-weight: 700; }
      .rt-match-key-row input { padding: 7px 9px; font-size: 13px; font-weight: 500; }
      .rt-match-key-row small { color: #667085; font-weight: 400; }
      .rt-tree-icon { width: 18px; color: #667085; }
      .rt-tree-name { min-width: 0; overflow-wrap: anywhere; }
      .rt-tree-meta { margin-left: auto; color: #667085; font-size: 12px; font-weight: 500; }
      .rt-modal-backdrop { position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center; box-sizing: border-box; padding: 24px; background: rgba(15, 23, 42, 0.46); }
      .rt-modal { width: min(560px, 100%); box-sizing: border-box; border: 1px solid #d9dee7; border-radius: 8px; background: #fff; color: #1f2937; box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22); padding: 18px; }
      .rt-modal.log-modal { width: min(920px, 100%); }
      .rt-modal.prompt-preset-modal { width: min(760px, 100%); }
      .rt-modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
      .rt-modal-head h3 { margin: 0; font-size: 18px; letter-spacing: 0; }
      .rt-modal-body { display: grid; gap: 8px; font-size: 14px; line-height: 1.65; }
      .rt-modal-body p { margin: 0; }
      .rt-log-output { max-height: min(68vh, 720px); min-height: 360px; white-space: pre-wrap; overflow: auto; padding: 12px; border-radius: 6px; border: 1px solid #d9dee7; background: #0f172a; color: #e5edf9; font-size: 12px; line-height: 1.55; font-family: Consolas, "D2Coding", monospace; }
      .rt-confirm-token { margin: 6px 0 2px; padding: 9px 10px; border: 1px solid #fed7aa; border-radius: 6px; background: #fff7ed; color: #9a3412; font-family: Consolas, "D2Coding", monospace; font-weight: 800; }
      .rt-modal-input { margin: 0; }
      .rt-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
      .rt-modal-confirm.danger { border-color: #dc2626; background: #dc2626; color: #fff; }
      .rt-modal-confirm.danger:hover { background: #b91c1c; }
      .rt-modal-confirm:disabled { opacity: 0.45; cursor: not-allowed; }
      .rt-modal-close { width: auto; min-width: 54px; padding: 6px 10px; }
      .rt-preset-add-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: end; margin: 4px 0 8px; }
      .rt-preset-add-row .rt-label { margin-bottom: 0; }
      .rt-preset-status { min-height: 18px; color: #667085; font-size: 12px; }
      .rt-preset-list { display: grid; gap: 8px; max-height: min(46vh, 430px); overflow: auto; padding-right: 2px; }
      .rt-preset-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px; border: 1px solid #e5eaf2; border-radius: 6px; background: #fff; }
      .rt-preset-row strong, .rt-preset-row small { display: block; min-width: 0; overflow-wrap: anywhere; }
      .rt-preset-row small { margin-top: 3px; color: #667085; font-size: 12px; line-height: 1.5; }
      .rt-preset-row-actions { display: flex; gap: 8px; align-items: center; }
      @media (max-width: 1180px) { .rt-layout { grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr); } .rt-reference-column { grid-column: 2; } }
      @media (max-width: 900px) { .rt-layout { grid-template-columns: 1fr; } .rt-reference-column { grid-column: auto; } .rt-voice-explorer { min-height: 360px; max-height: 520px; } }
      @media (max-width: 760px) { .rt-page { padding: 14px; } .rt-header { flex-direction: column; } .rt-header-actions { width: 100%; justify-content: flex-start; } .rt-voice-explorer { min-height: 300px; max-height: 420px; } }
      @media (prefers-color-scheme: dark) {
        .rt-page { color: #e5e7eb; background: #111827; }
        .rt-panel { background: #1f2937; border-color: #374151; }
        input, textarea, select { background: #111827; color: #f9fafb; border-color: #4b5563; }
        .rt-button.secondary { background: #111827; color: #e5e7eb; border-color: #4b5563; }
        .rt-button.danger { background: #111827; color: #fca5a5; border-color: #7f1d1d; }
        .rt-button.danger:hover { background: #3f1d22; }
        .rt-play-explorer-voice.playing { background: #3f1d22; color: #fca5a5; border-color: #ef4444; }
        .rt-play-explorer-voice.muted { color: #94a3b8; background: #111827; }
        .rt-option-card { background: #111827; border-color: #374151; }
        .rt-option-card small { color: #9ca3af; }
        .rt-help-card { background: #111827; border-color: #374151; color: #9ca3af; }
        .rt-warning-note { background: #431407; border-color: #9a3412; color: #fed7aa; }
        .rt-fold { background: #111827; border-color: #374151; }
        .rt-fold[open] summary { background: #1f2937; border-color: #374151; }
        .rt-fold summary { color: #e5e7eb; }
        .rt-sub-details { background: #111827; border-color: #374151; }
        .rt-sub-details[open] summary { background: #1f2937; border-color: #374151; }
        .rt-sub-details summary { color: #e5e7eb; }
        .rt-voice-explorer, .rt-hidden-bots { background: #111827; border-color: #374151; }
        .rt-hidden-bots > summary { color: #e5e7eb; }
        .rt-hidden-bots[open] > summary { background: #1f2937; border-color: #374151; }
        .rt-hidden-bot-row { background: #1f2937; border-color: #374151; }
        .rt-hidden-bot-row small { color: #9ca3af; }
        .rt-voice-maintenance { background: #111827; border-color: #374151; }
        .rt-voice-maintenance small { color: #9ca3af; }
        .rt-unregistered-references { border-color: #374151; }
        .rt-unregistered-title { color: #e5e7eb; }
        .rt-unregistered-voice { background: #1f2937; border-color: #4b5563; }
        .rt-unregistered-voice.dragging { background: #164e63; border-color: #67e8f9; }
        .rt-unregistered-voice small { color: #9ca3af; }
        .rt-tree-bot > summary { background: #172554; color: #dbeafe; }
        .rt-tree-folder > summary { background: #111827; color: #e5e7eb; border-color: #4b5563; }
        .rt-tree-character > summary, .rt-tree-reference { background: #1f2937; color: #e5e7eb; border-color: #374151; }
        .rt-tree-bot.active > summary, .rt-tree-character.active > summary { background: #1e3a8a; border-color: #60a5fa; color: #dbeafe; }
        .rt-drop-target > summary { background: #164e63 !important; outline-color: #67e8f9; }
        .rt-tree-reference.selected { background: #1e3a8a; border-color: #60a5fa; }
        .rt-tree-reference.missing { background: #111827; border-color: #475569; color: #94a3b8; }
        .rt-tree-reference.missing small { color: #64748b; }
        .rt-tree-reference.missing .rt-tree-actions .rt-button:not(.danger) { color: #94a3b8; background: #111827; border-color: #475569; }
        .rt-missing-badge { background: #334155; color: #cbd5e1; }
        .rt-tree-caption { background: #111827; }
        .rt-tree-folder-note { color: #9ca3af; }
        .rt-match-key-row { background: #111827; border-color: #374151; color: #e5e7eb; }
        .rt-modal-backdrop { background: rgba(0, 0, 0, 0.62); }
        .rt-modal { background: #1f2937; border-color: #374151; color: #e5e7eb; }
        .rt-log-output { border-color: #374151; background: #020617; color: #e5edf9; }
        .rt-confirm-token { background: #3f2d1a; border-color: #9a3412; color: #fed7aa; }
        .rt-preset-status { color: #9ca3af; }
        .rt-preset-row { background: #111827; border-color: #374151; }
        .rt-preset-row small { color: #9ca3af; }
        .rt-batch-ops { background: #0f172a; border-color: #334155; }
        .rt-batch-ops > summary { color: #93c5fd; }
        .rt-batch-progress { color: #94a3b8; }
        .rt-batch-progress-bar { background: #1e293b; }
        .rt-tree-character.batch-selected > summary { background: #1e3a8a !important; }
        .rt-tree-character.batch-selected > summary .rt-tree-name { color: #dbeafe; }
      }
    `;
    document.head.appendChild(style);
  }

  function wireSettings(characterId, characterName, hasCurrentCharacter = true) {
    const status = document.getElementById("rt-status");
    const writeStatus = (message) => {
      status.textContent = String(message);
      addRuntimeLog("설정 화면 상태", message);
    };
    let activeVoiceCharacterId = hasCurrentCharacter ? characterId : GLOBAL_NARRATION_ID;
    let activeVoiceBotId = hasCurrentCharacter ? characterId : GLOBAL_BOT_ID;
    let activeVoiceBotName = hasCurrentCharacter ? characterName : GLOBAL_BOT_NAME;

    const selectedCharacterName = () => {
      if (hasCurrentCharacter && activeVoiceCharacterId === characterId) return characterName;
      if (isDefaultGlobalVoiceCharacterId(activeVoiceCharacterId)) return globalVoiceDefinition(activeVoiceCharacterId).name;
      return voiceReferencesByCharacter[activeVoiceCharacterId]?.characterName || activeVoiceBotName || activeVoiceCharacterId;
    };

    let activeSettingsTaskCount = 0;
    let activeSettingsTaskLabel = "";
    const managedTaskButtonSelector = [
      "#rt-health",
      "#rt-save-server-data",
      "#rt-import-server-data",
      "#rt-scan-lorebook-characters",
      "#rt-add-lorebook-character",
      "#rt-batch-select-all",
      "#rt-batch-deselect-all",
      "#rt-batch-captions",
      "#rt-batch-references",
      "#rt-batch-auto-select",
      "#rt-generate-selected-voice",
      "#rt-generate-voice",
      "#rt-reset-caption-inputs",
      "#rt-reset-voice-design-inputs",
      "#rt-translation-prompt-presets",
      "#rt-emotion-director-prompt-presets",
      "#rt-audit-voice-files",
      ".rt-delete-bot",
      ".rt-restore-hidden-bot",
      ".rt-rename-lorebook-character",
      ".rt-delete-lorebook-character",
      ".rt-color-character",
      ".rt-play-explorer-voice",
      ".rt-move-explorer-voice",
      ".rt-move-unregistered-voice",
      ".rt-delete-unregistered-voice",
      "#rt-delete-selected-unregistered",
      ".rt-rename-explorer-voice",
      ".rt-use-explorer-voice",
      ".rt-lock-explorer-voice",
      ".rt-delete-explorer-voice",
    ].join(",");

    const applySettingsTaskLock = () => {
      const busy = activeSettingsTaskCount > 0;
      document.querySelectorAll(managedTaskButtonSelector).forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        if (busy) {
          if (!button.dataset.rtBusySaved) {
            button.dataset.rtBusySaved = "1";
            button.dataset.rtWasDisabled = button.disabled ? "1" : "0";
          }
          button.disabled = true;
          button.classList.add("rt-busy-disabled");
        } else if (button.dataset.rtBusySaved) {
          button.disabled = button.dataset.rtWasDisabled === "1";
          delete button.dataset.rtBusySaved;
          delete button.dataset.rtWasDisabled;
          button.classList.remove("rt-busy-disabled");
        }
      });
    };

    const beginSettingsTask = (label) => {
      activeSettingsTaskCount += 1;
      activeSettingsTaskLabel = label || activeSettingsTaskLabel || "작업";
      applySettingsTaskLock();
      return () => {
        activeSettingsTaskCount = Math.max(0, activeSettingsTaskCount - 1);
        if (!activeSettingsTaskCount) activeSettingsTaskLabel = "";
        applySettingsTaskLock();
      };
    };

    const runSettingsTask = async (label, task) => {
      const endTask = beginSettingsTask(label);
      try {
        return await task();
      } finally {
        endTask();
      }
    };

    const settingsTaskIsBusy = () => activeSettingsTaskCount > 0;

    const requestDangerConfirm = ({ title, lines, confirmText = "" }) => new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "rt-modal-backdrop";
      overlay.tabIndex = -1;
      overlay.innerHTML = `
        <section class="rt-modal" role="dialog" aria-modal="true" aria-label="${htmlEscape(title)}">
          <div class="rt-modal-head">
            <h3>${htmlEscape(title)}</h3>
            <button class="rt-button secondary rt-modal-close" type="button">닫기</button>
          </div>
          <div class="rt-modal-body">
            ${lines.map((line) => `<p>${htmlEscape(line)}</p>`).join("")}
            ${confirmText ? `
              <div class="rt-confirm-token">${htmlEscape(confirmText)}</div>
              <label class="rt-label rt-modal-input">
                <span>확인 문구 입력</span>
                <input class="rt-confirm-input" type="text" autocomplete="off" placeholder="${htmlEscape(confirmText)}">
              </label>
            ` : ""}
          </div>
          <div class="rt-modal-actions">
            <button class="rt-button secondary rt-modal-cancel" type="button">취소</button>
            <button class="rt-button danger rt-modal-confirm" type="button"${confirmText ? " disabled" : ""}>삭제</button>
          </div>
        </section>
      `;
      document.body.appendChild(overlay);

      const input = overlay.querySelector(".rt-confirm-input");
      const confirm = overlay.querySelector(".rt-modal-confirm");
      const cleanup = (value) => {
        overlay.remove();
        resolve(value);
      };

      const refreshConfirm = () => {
        if (!input || !confirm || !confirmText) return;
        confirm.disabled = input.value.trim() !== confirmText;
      };

      overlay.querySelector(".rt-modal-cancel")?.addEventListener("click", () => cleanup(false));
      overlay.querySelector(".rt-modal-close")?.addEventListener("click", () => cleanup(false));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) cleanup(false);
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") cleanup(false);
      });
      input?.addEventListener("input", refreshConfirm);
      confirm?.addEventListener("click", () => {
        if (!confirmText || input?.value.trim() === confirmText) cleanup(true);
      });
      refreshConfirm();
      setTimeout(() => (input || confirm || overlay).focus(), 0);
    });

    const requestSimpleConfirm = ({ title, lines, confirmLabel = "계속", danger = false }) => new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "rt-modal-backdrop";
      overlay.tabIndex = -1;
      overlay.innerHTML = `
        <section class="rt-modal" role="dialog" aria-modal="true" aria-label="${htmlEscape(title)}">
          <div class="rt-modal-head">
            <h3>${htmlEscape(title)}</h3>
            <button class="rt-button secondary rt-modal-close" type="button">닫기</button>
          </div>
          <div class="rt-modal-body">
            ${lines.map((line) => `<p>${htmlEscape(line)}</p>`).join("")}
          </div>
          <div class="rt-modal-actions">
            <button class="rt-button secondary rt-modal-cancel" type="button">취소</button>
            <button class="rt-button ${danger ? "danger rt-modal-confirm danger" : "rt-modal-confirm"}" type="button">${htmlEscape(confirmLabel)}</button>
          </div>
        </section>
      `;
      document.body.appendChild(overlay);
      const cleanup = (value) => {
        overlay.remove();
        resolve(value);
      };
      overlay.querySelector(".rt-modal-cancel")?.addEventListener("click", () => cleanup(false));
      overlay.querySelector(".rt-modal-close")?.addEventListener("click", () => cleanup(false));
      overlay.querySelector(".rt-modal-confirm")?.addEventListener("click", () => cleanup(true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) cleanup(false);
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") cleanup(false);
      });
      setTimeout(() => overlay.querySelector(".rt-modal-confirm")?.focus(), 0);
    });

    const requestCharacterColor = ({ title, currentColor }) => new Promise((resolve) => {
      const selectedColor = normalizeVoiceColor(currentColor) || VOICE_COLOR_PRESETS[0][0];
      const overlay = document.createElement("div");
      overlay.className = "rt-modal-backdrop";
      overlay.tabIndex = -1;
      overlay.innerHTML = `
        <section class="rt-modal" role="dialog" aria-modal="true" aria-label="${htmlEscape(title)}">
          <div class="rt-modal-head">
            <h3>${htmlEscape(title)}</h3>
            <button class="rt-button secondary rt-modal-close" type="button">닫기</button>
          </div>
          <div class="rt-modal-body">
            <p>채팅 화면의 스피커 버튼에 표시할 캐릭터 색상을 고르세요.</p>
            <div class="rt-color-swatch-grid">
              ${VOICE_COLOR_PRESETS.map(([color, label]) => `
                <button class="rt-color-swatch ${color === selectedColor ? "selected" : ""}" type="button" data-color="${htmlEscape(color)}" title="${htmlEscape(label)}">
                  <span class="rt-color-dot" style="background:${htmlEscape(color)};"></span>
                  <span>${htmlEscape(label)}</span>
                </button>
              `).join("")}
            </div>
          </div>
          <div class="rt-modal-actions">
            <button class="rt-button secondary rt-modal-cancel" type="button">취소</button>
          </div>
        </section>
      `;
      document.body.appendChild(overlay);

      const cleanup = (value) => {
        overlay.remove();
        resolve(value);
      };
      overlay.querySelector(".rt-modal-cancel")?.addEventListener("click", () => cleanup(""));
      overlay.querySelector(".rt-modal-close")?.addEventListener("click", () => cleanup(""));
      overlay.querySelectorAll(".rt-color-swatch").forEach((button) => {
        button.addEventListener("click", () => cleanup(normalizeVoiceColor(button.dataset.color || "")));
      });
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) cleanup("");
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") cleanup("");
      });
      setTimeout(() => overlay.querySelector(".rt-color-swatch.selected")?.focus(), 0);
    });

    const openLogModal = () => {
      const overlay = document.createElement("div");
      overlay.className = "rt-modal-backdrop";
      overlay.tabIndex = -1;
      overlay.innerHTML = `
        <section class="rt-modal log-modal" role="dialog" aria-modal="true" aria-label="RisuTTS 로그">
          <div class="rt-modal-head">
            <h3>RisuTTS 로그</h3>
            <button class="rt-button secondary rt-log-clear" type="button">로그 비우기</button>
          </div>
          <div class="rt-modal-body">
            <p class="rt-muted">최근 ${LOG_LIMIT}개까지 보관합니다. 이 화면은 로컬 디버깅용 원문을 표시하고, 로그 복사는 본문과 외부 URL을 자동으로 가립니다.</p>
            <p class="rt-warning-note">주의: 이 화면에는 대사 원문, 번역문, 사설 엔드포인트 같은 민감한 정보가 그대로 보일 수 있습니다. 버그 리포트에는 스크린샷이나 직접 드래그 복사 대신 반드시 아래의 로그 복사 버튼을 사용하세요.</p>
            <pre class="rt-log-output">${htmlEscape(formatRuntimeLogs())}</pre>
          </div>
          <div class="rt-modal-actions">
            <button class="rt-button secondary rt-log-copy" type="button">로그 복사</button>
            <button class="rt-button rt-modal-close-primary" type="button">닫기</button>
          </div>
        </section>
      `;
      document.body.appendChild(overlay);

      const cleanup = () => overlay.remove();
      const output = overlay.querySelector(".rt-log-output");
      const refresh = () => {
        if (output) output.textContent = formatRuntimeLogs();
      };
      overlay.querySelector(".rt-modal-close-primary")?.addEventListener("click", cleanup);
      overlay.querySelector(".rt-log-clear")?.addEventListener("click", () => {
        runtimeLogs.length = 0;
        addRuntimeLog("로그 비움", "사용자가 설정 화면에서 로그를 비웠습니다.");
        refresh();
      });
      overlay.querySelector(".rt-log-copy")?.addEventListener("click", async () => {
        const logText = formatRuntimeLogsForCopy();
        let copied = false;
        try {
          if (globalThis.navigator?.clipboard?.writeText) {
            await globalThis.navigator.clipboard.writeText(logText);
            copied = true;
          }
        } catch {
          copied = false;
        }
        if (!copied) {
          try {
            const textarea = document.createElement("textarea");
            textarea.value = logText;
            textarea.setAttribute("readonly", "readonly");
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.select();
            copied = document.execCommand?.("copy") === true;
            textarea.remove();
          } catch {
            copied = false;
          }
        }
        addRuntimeLog(copied ? "로그 복사" : "로그 복사 실패", copied ? "민감정보를 가린 로그를 클립보드에 복사했습니다." : "클립보드 권한이 없어 복사하지 못했습니다.");
        refresh();
      });
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) cleanup();
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") cleanup();
      });
      setTimeout(() => overlay.querySelector(".rt-modal-close-primary")?.focus(), 0);
    };

    const captureVoiceExplorerState = () => {
      const tree = document.getElementById("rt-voice-explorer");
      if (!tree) return null;
      const checkedCharacters = Array.from(tree.querySelectorAll(".rt-character-select:checked"))
        .map((input) => input.dataset.characterId || "")
        .filter(Boolean);
      const checkedReferences = Array.from(tree.querySelectorAll(".rt-reference-select:checked"))
        .map((input) => `${input.dataset.characterId || ""}|${input.dataset.voiceId || ""}`)
        .filter(Boolean);
      const checkedUnregistered = Array.from(tree.querySelectorAll(".rt-unregistered-select:checked"))
        .map((input) => input.dataset.voiceId || "")
        .filter(Boolean);
      return {
        scrollTop: tree.scrollTop || 0,
        scrollLeft: tree.scrollLeft || 0,
        openBots: Array.from(tree.querySelectorAll(".rt-tree-bot[open]"))
          .map((node) => node.dataset.botId || "")
          .filter(Boolean),
        openFolders: Array.from(tree.querySelectorAll(".rt-tree-folder[open]"))
          .map((node) => node.dataset.folderId || "")
          .filter(Boolean),
        openCharacters: Array.from(tree.querySelectorAll(".rt-tree-character[open]"))
          .map((node) => node.dataset.characterId || "")
          .filter(Boolean),
        checkedCharacters,
        checkedReferences,
        checkedUnregistered,
      };
    };

    const restoreVoiceExplorerState = (state) => {
      if (!state) return;
      const tree = document.getElementById("rt-voice-explorer");
      if (!tree) return;
      const openBots = new Set(state.openBots || []);
      const openFolders = new Set(state.openFolders || []);
      const openCharacters = new Set(state.openCharacters || []);
      const checkedCharacters = new Set(state.checkedCharacters || []);
      const checkedReferences = new Set(state.checkedReferences || []);
      const checkedUnregistered = new Set(state.checkedUnregistered || []);
      tree.querySelectorAll(".rt-tree-bot").forEach((node) => {
        if (openBots.has(node.dataset.botId || "")) node.open = true;
      });
      tree.querySelectorAll(".rt-tree-folder").forEach((node) => {
        if (openFolders.has(node.dataset.folderId || "")) node.open = true;
      });
      tree.querySelectorAll(".rt-tree-character").forEach((node) => {
        if (openCharacters.has(node.dataset.characterId || "")) node.open = true;
        const charSelect = node.querySelector("summary .rt-character-select");
        if (charSelect instanceof HTMLInputElement && !charSelect.disabled) {
          charSelect.checked = checkedCharacters.has(node.dataset.characterId || "");
        }
      });
      tree.querySelectorAll(".rt-reference-select").forEach((input) => {
        if (input instanceof HTMLInputElement && !input.disabled) {
          const key = `${input.dataset.characterId || ""}|${input.dataset.voiceId || ""}`;
          input.checked = checkedReferences.has(key);
        }
      });
      tree.querySelectorAll(".rt-unregistered-select").forEach((input) => {
        if (input instanceof HTMLInputElement && !input.disabled) {
          input.checked = checkedUnregistered.has(input.dataset.voiceId || "");
        }
      });
      const restoreScroll = () => {
        tree.scrollTop = Math.min(state.scrollTop || 0, Math.max(0, tree.scrollHeight - tree.clientHeight));
        tree.scrollLeft = state.scrollLeft || 0;
      };
      restoreScroll();
      if (typeof globalThis.requestAnimationFrame === "function") {
        globalThis.requestAnimationFrame(restoreScroll);
      }
    };

    const refreshVoiceExplorer = () => {
      const tree = document.getElementById("rt-voice-explorer");
      if (!tree) return;
      const hiddenBotManager = document.getElementById("rt-hidden-bot-manager");
      const voiceFileMaintenance = document.getElementById("rt-voice-maintenance");
      const unregisteredDetails = voiceFileMaintenance?.querySelector?.(".rt-unregistered-references");
      if (unregisteredDetails) {
        unregisteredReferencesOpen = Boolean(unregisteredDetails.open);
      }
      const previousState = captureVoiceExplorerState();
      const currentCharacter = hasCurrentCharacter ? { name: characterName, chaId: characterId } : null;
      tree.outerHTML = renderVoiceExplorer(currentCharacter, activeVoiceCharacterId, activeVoiceBotId);
      if (voiceFileMaintenance) {
        voiceFileMaintenance.outerHTML = renderVoiceFileMaintenance();
      }
      if (hiddenBotManager) {
        const wasOpen = hiddenBotManager.open;
        hiddenBotManager.outerHTML = renderHiddenBotManager();
        const nextHiddenBotManager = document.getElementById("rt-hidden-bot-manager");
        if (nextHiddenBotManager && wasOpen) nextHiddenBotManager.open = true;
      }
      wireExplorerControls();
      restoreVoiceExplorerState(previousState);
      updateBatchButtonStates();
      applySettingsTaskLock();
    };

    const activeParentCharacter = async () => {
      if (activeVoiceBotId === GLOBAL_BOT_ID) {
        return globalParentCharacter();
      }
      if (activeVoiceBotId && (!hasCurrentCharacter || activeVoiceBotId !== characterId)) {
        return {
          name: activeVoiceBotName || activeVoiceBotId,
          chaId: activeVoiceBotId,
          id: activeVoiceBotId,
        };
      }
      if (hasCurrentCharacter) {
        return api.getCharacter().catch(() => ({ name: characterName, chaId: characterId }));
      }
      return globalParentCharacter();
    };

    const resolveActiveVoiceCharacter = async () => {
      const parentCharacter = await activeParentCharacter();
      if (hasCurrentCharacter && (!activeVoiceCharacterId || activeVoiceCharacterId === characterId)) {
        return {
          key: characterId,
          character: parentCharacter,
        };
      }
      const existing = voiceReferencesByCharacter[activeVoiceCharacterId];
      if (isDefaultGlobalVoiceCharacterId(activeVoiceCharacterId)) {
        return {
          key: activeVoiceCharacterId,
          character: characterFromReferenceSet(defaultGlobalReferenceSetForId(activeVoiceCharacterId, existing), globalParentCharacter()),
        };
      }
      return {
        key: activeVoiceCharacterId,
        character: existing
          ? characterFromReferenceSet(existing, parentCharacter)
          : {
              name: activeVoiceBotName || activeVoiceCharacterId,
              chaId: activeVoiceCharacterId,
              id: activeVoiceCharacterId,
              parentCharacter,
            },
      };
    };

    const auditVoiceFilesForExplorer = async (options = {}) => {
      const voices = await requestHelperVoiceList();
      const missing = auditRegisteredVoiceFiles(voices);
      const unregistered = unregisteredVoiceFiles(voices);
      const missingCharacterSummary = summarizeMissingReferenceCharacters(missing);
      unregisteredVoiceFilesForExplorer = unregistered;
      refreshVoiceExplorer();
      const message = [
        "레퍼런스 파일 확인 완료.",
        `voices 폴더 wav: ${voices.length}개`,
        `보이스 탐색기 등록: ${registeredVoiceIds().size}개`,
        `파일이 없는 등록 레퍼런스: ${missing.length}개${missingCharacterSummary ? ` (${missingCharacterSummary})` : ""}`,
        `미등록 wav: ${unregistered.length}개`,
        missing.length ? "파일이 없는 레퍼런스는 보이스 탐색기에서 회색으로 표시됩니다." : "",
        unregistered.length ? "미등록 레퍼런스 칸에서 들어본 뒤 원하는 캐릭터 줄로 옮길 수 있습니다." : "",
      ].filter(Boolean).join("\n");
      addRuntimeLog("레퍼런스 파일 확인", {
        voices: voices.length,
        registered: registeredVoiceIds().size,
        missing: missing.length,
        missingCharacters: missingCharacterSummary,
        missingExamples: missing.slice(0, 10).map((item) => ({
          characterName: item.characterName,
          voiceId: item.voiceId,
        })),
        unregistered: unregistered.length,
      });
      if (!options.silent || missing.length || unregistered.length) {
        writeStatus(message);
      }
      return { voices, missing, unregistered, message };
    };

    const registerUnregisteredVoiceToTarget = async (voice, target) => {
      const voiceId = String(voice?.voiceId || "").trim();
      const targetKey = String(target?.characterId || "").trim();
      if (!voiceId || !targetKey) {
        throw new Error("등록할 미등록 레퍼런스나 대상 캐릭터를 찾지 못했습니다.");
      }
      const existing = voiceReferencesByCharacter[targetKey] || null;
      const targetReferences = referenceItems(existing);
      const alreadyExists = targetReferences.some((reference) => (reference?.voiceId || "") === voiceId);
      const importedReference = referenceFromVoiceFile(voice);
      const importedSet = {
        botId: existing?.botId || target.botId || targetKey,
        botName: existing?.botName || target.botName || target.characterName || targetKey,
        characterId: targetKey,
        characterName: existing?.characterName || target.characterName || targetKey,
        lorebookCharacter: Boolean(existing?.lorebookCharacter),
        characterProfile: existing?.characterProfile || null,
        discoveredAt: existing?.discoveredAt || "",
        caption: existing?.caption || "",
        sampleText: existing?.sampleText || "",
        generatedAt: existing?.generatedAt || new Date().toISOString(),
        model: existing?.model || "imported-voice-file",
        references: [importedReference],
        raw: existing?.raw || null,
      };
      voiceReferencesByCharacter[targetKey] = mergeVoiceReferenceSet(existing, importedSet);
      const mergedReferenceSet = voiceReferencesByCharacter[targetKey];
      const targetBotId = mergedReferenceSet?.botId || target.botId || targetKey;
      await saveConfig({ ...readFormConfig(), ...withoutHiddenBot(targetBotId) });
      await saveVoiceReferences();
      unregisteredVoiceFilesForExplorer = unregisteredVoiceFilesForExplorer
        .filter((item) => String(item?.voiceId || "").trim() !== voiceId);
      addRuntimeLog("미등록 레퍼런스 등록", {
        voiceId,
        targetCharacter: voiceReferencesByCharacter[targetKey]?.characterName || target.characterName || targetKey,
        targetCharacterId: targetKey,
        alreadyExists,
      });
      return {
        moved: true,
        alreadyExists,
        voiceId,
        sourceName: "미등록 레퍼런스",
        targetName: voiceReferencesByCharacter[targetKey]?.characterName || target.characterName || targetKey,
      };
    };

    const deleteUnregisteredVoiceFiles = async (voices) => {
      const targets = Array.isArray(voices) ? voices.filter((voice) => voice?.voiceId) : [];
      if (!targets.length) {
        throw new Error("삭제할 미등록 레퍼런스를 찾지 못했습니다.");
      }
      const targetVoiceIds = targets
        .map((voice) => String(voice?.voiceId || "").trim())
        .filter(Boolean);
      const metadata = await requestHelperVoiceMetadata().catch(() => null);
      const usages = voiceUsageInSharedMetadata(metadata, targetVoiceIds);
      if (usages.length) {
        const examples = usages.slice(0, 12).map((usage) => (
          `- ${usage.voiceId}: ${usage.profileLabel} / ${usage.characterName}`
        ));
        throw new Error([
          "다른 메타데이터 프로필에서 사용 중인 wav가 포함되어 있어 실제 파일을 삭제할 수 없습니다.",
          ...examples,
          usages.length > examples.length ? `외 ${usages.length - examples.length}건` : "",
          "",
          "먼저 해당 프로필에서 레퍼런스를 제거한 뒤 다시 시도하세요.",
        ].filter(Boolean).join("\n"));
      }
      let fileDeletedCount = 0;
      let fileAlreadyMissingCount = 0;
      const deleteWarnings = [];
      const removedVoiceIds = [];
      for (const voice of targets) {
        const voiceId = String(voice.voiceId || "").trim();
        if (!voiceId) continue;
        try {
          if (await deleteReferenceVoiceFile(voiceId)) {
            fileDeletedCount += 1;
          } else {
            fileAlreadyMissingCount += 1;
          }
          removedVoiceIds.push(voiceId);
          clearAudioCacheForVoice(voiceId);
        } catch (error) {
          deleteWarnings.push(`${voiceId}: ${describeError(error)}`);
        }
      }
      if (deleteWarnings.length) {
        throw new Error([
          "미등록 레퍼런스 wav 파일을 삭제하지 못했습니다.",
          "start-risutts.cmd로 보이스 레퍼런스 Helper가 켜져 있는지 확인한 뒤 다시 시도하세요.",
          "",
          deleteWarnings.join("\n"),
        ].join("\n"));
      }
      const removedSet = new Set(removedVoiceIds);
      unregisteredVoiceFilesForExplorer = unregisteredVoiceFilesForExplorer
        .filter((voice) => !removedSet.has(String(voice?.voiceId || "").trim()));
      addRuntimeLog("미등록 레퍼런스 삭제", {
        count: removedVoiceIds.length,
        deleted: fileDeletedCount,
        alreadyMissing: fileAlreadyMissingCount,
        voices: removedVoiceIds,
      });
      return { removedVoiceIds, fileDeletedCount, fileAlreadyMissingCount };
    };

    const generateCaptionForCharacter = async (targetCharacter, targetKey, output) => {
      output.textContent = `${targetCharacter?.name || "캐릭터"} 정보와 로어북을 확인하는 중...`;

      const guidance = document.getElementById("rt-voice-guidance")?.value || "";
      const generated = await generateCaptionForCurrentCharacter(targetCharacter, guidance);
      document.getElementById("rt-voice-caption").value = generated.caption;
      document.getElementById("rt-voice-sample-text").value = generated.sampleText;
      const existing = voiceReferencesByCharacter[targetKey] || null;
      voiceReferencesByCharacter[targetKey] = mergeVoiceReferenceSet(existing, {
        botId: isDefaultGlobalVoiceCharacterId(targetKey) ? GLOBAL_BOT_ID : existing?.botId || getCharacterId(targetCharacter?.parentCharacter || targetCharacter),
        botName: isDefaultGlobalVoiceCharacterId(targetKey) ? GLOBAL_BOT_NAME : existing?.botName || targetCharacter?.parentCharacter?.name || targetCharacter?.name || targetKey,
        characterId: targetKey || getCharacterId(targetCharacter),
        characterName: targetCharacter?.name || targetKey,
        lorebookCharacter: Boolean(existing?.lorebookCharacter),
        characterProfile: existing?.characterProfile || null,
        discoveredAt: existing?.discoveredAt || "",
        caption: generated.caption,
        sampleText: generated.sampleText,
        generatedAt: existing?.generatedAt || "",
        model: existing?.model || "Aratako/Irodori-TTS-600M-v3-VoiceDesign",
        references: referenceItems(existing),
        raw: existing?.raw || null,
      });
      const mergedReferenceSet = voiceReferencesByCharacter[targetKey];
      const targetBotId = mergedReferenceSet?.botId || getCharacterId(targetCharacter?.parentCharacter || targetCharacter);
      await saveConfig({ ...readFormConfig(), ...withoutHiddenBot(targetBotId) });
      await saveVoiceReferences();
      refreshVoiceExplorer();
      output.textContent = [
        "캡션 작성 완료.",
        `대상 캐릭터: ${targetCharacter?.name || targetKey}`,
        `보이스 디자인 캡션 작성 모델: ${generated.modelSource === "main" ? "메인 모델" : "보조 모델"}`,
        `로어북/캐릭터 정보 조각: ${generated.context.lorebookEntries.length}`,
        generated.guidance ? `생성 방향: ${generated.guidance}` : "",
        generated.supplementalResearch ? `조사 자료: ${generated.supplementalResearch.length}자 반영` : "",
        `레퍼런스 생성용 대사: ${generated.sampleText}`,
        "",
        generated.caption,
        "",
        "레퍼런스 설정의 캡션과 대사를 확인한 뒤, 보이스 레퍼런스 생성 버튼을 누르세요.",
      ].join("\n");
    };

    let batchOperationAborted = false;

    const selectedLorebookCharacterIds = () => {
      const checked = Array.from(document.querySelectorAll(".rt-character-select:checked"))
        .map((input) => input.dataset.characterId || "")
        .filter(Boolean);
      const seen = new Set();
      return checked
        .map((id) => {
          const ref = voiceReferencesByCharacter[id];
          if (!ref || !ref.lorebookCharacter) return null;
          if (seen.has(id)) return null;
          seen.add(id);
          return id;
        })
        .filter(Boolean);
    };

    const updateBatchButtonStates = () => {
      const ids = selectedLorebookCharacterIds();
      const hasSelection = ids.length > 0;
      const busy = settingsTaskIsBusy();
      document.querySelectorAll("#rt-batch-captions, #rt-batch-references, #rt-batch-auto-select").forEach((btn) => {
        if (btn instanceof HTMLButtonElement) btn.disabled = !hasSelection || busy;
      });
      document.querySelectorAll(".rt-tree-character").forEach((node) => {
        const id = node.dataset.characterId || "";
        if (ids.includes(id)) node.classList.add("batch-selected");
        else node.classList.remove("batch-selected");
      });
    };

    const updateBatchProgress = (current, total, text = "") => {
      const wrapper = document.getElementById("rt-batch-progress");
      const fill = document.getElementById("rt-batch-progress-fill");
      const label = document.getElementById("rt-batch-progress-text");
      if (!wrapper || !fill || !label) return;
      if (total <= 0) {
        wrapper.hidden = true;
        fill.style.width = "0%";
        label.textContent = "";
        return;
      }
      wrapper.hidden = false;
      const pct = Math.min(100, Math.round((current / total) * 100));
      fill.style.width = `${pct}%`;
      label.textContent = `(${current}/${total})${text ? ` ${text}` : ""}`;
    };

    const autoSelectUnusedReference = (characterId) => {
      const referenceSet = voiceReferencesByCharacter[characterId];
      if (!referenceSet) return false;
      const references = referenceItems(referenceSet);
      if (!references.length) return false;
      const existing = config.voiceByCharacter?.[characterId] || "";
      if (existing && references.some((r) => r.voiceId === existing)) return false;
      const usedVoiceIds = new Set(Object.values(config.voiceByCharacter || {}));
      const unlockedUnused = references.find((r) => r.voiceId && !r.locked && !r.fileMissing && !usedVoiceIds.has(r.voiceId));
      if (unlockedUnused) {
        config.voiceByCharacter = { ...config.voiceByCharacter, [characterId]: unlockedUnused.voiceId };
        return true;
      }
      const anyUnused = references.find((r) => r.voiceId && !r.fileMissing && !usedVoiceIds.has(r.voiceId));
      if (anyUnused) {
        config.voiceByCharacter = { ...config.voiceByCharacter, [characterId]: anyUnused.voiceId };
        return true;
      }
      return false;
    };

    const batchGenerateCaptions = async () => {
      if (!settingsTaskIsBusy()) batchOperationAborted = false;
      const characterIds = selectedLorebookCharacterIds();
      if (!characterIds.length) {
        writeStatus("일괄 캡션 생성: 캐릭터를 먼저 선택하세요.");
        return;
      }
      await runSettingsTask(`일괄 캡션 생성 (${characterIds.length}명)`, async () => {
        await saveConfig(readFormConfig());
        const output = document.getElementById("rt-voice-design-output");
        const parentCharacter = await activeParentCharacter();
        const concurrencyRaw = Math.min(BATCH_CAPTION_CONCURRENCY_MAX, Math.max(1, Number(document.getElementById("rt-batch-concurrency")?.value) || DEFAULT_CONFIG.batchCaptionConcurrency));
        document.getElementById("rt-batch-concurrency").value = String(concurrencyRaw);
        const results = [];
        const completed = [];
        let nextIdx = 0;
        const doOne = async () => {
          while (!batchOperationAborted) {
            const myIdx = nextIdx;
            nextIdx += 1;
            if (myIdx >= characterIds.length) return;
            const charId = characterIds[myIdx];
            const referenceSet = voiceReferencesByCharacter[charId];
            if (!referenceSet) { completed.push(myIdx); continue; }
            const targetName = referenceSet.characterName || charId;
            updateBatchProgress(completed.length, characterIds.length, targetName);
            if (output) output.textContent = `일괄 캡션 생성 중... (${completed.length + 1}/${characterIds.length}) ${targetName}`;
            try {
              const character = characterFromReferenceSet(referenceSet, parentCharacter);
              await generateCaptionForCharacter(character, charId, output);
              results.push({ charId, name: targetName, status: "ok" });
            } catch (error) {
              addRuntimeLog("일괄 캡션 생성 실패", { target: targetName, error: describeError(error) });
              results.push({ charId, name: targetName, status: "error", error: describeError(error) });
            }
            completed.push(myIdx);
          }
        };
        const workers = [];
        for (let w = 0; w < concurrencyRaw; w += 1) workers.push(doOne());
        await Promise.all(workers);
        updateBatchProgress(results.length, characterIds.length, "완료");
        const okCount = results.filter((r) => r.status === "ok").length;
        const errors = results.filter((r) => r.status === "error");
        if (output) output.textContent = [
          batchOperationAborted ? "일괄 캡션 생성 중단됨." : "일괄 캡션 생성 완료.",
          `성공: ${okCount}/${characterIds.length}`,
          ...errors.map((r) => `- ${r.name}: ${r.error}`),
        ].join("\n");
        addRuntimeLog("일괄 캡션 생성 완료", { total: characterIds.length, ok: okCount, errors: errors.length, concurrency: concurrencyRaw });
        setTimeout(() => updateBatchProgress(0, 0), 3000);
      });
    };

    const batchGenerateReferences = async () => {
      if (!settingsTaskIsBusy()) batchOperationAborted = false;
      const characterIds = selectedLorebookCharacterIds();
      if (!characterIds.length) {
        writeStatus("일괄 레퍼런스 생성: 캐릭터를 먼저 선택하세요.");
        return;
      }
      await runSettingsTask(`일괄 레퍼런스 생성 (${characterIds.length}명)`, async () => {
        await saveConfig(readFormConfig());
        const output = document.getElementById("rt-voice-design-output");
        const parentCharacter = await activeParentCharacter();
        const rawCount = Number(document.getElementById("rt-voice-count")?.value || DEFAULT_CONFIG.voiceReferenceCount);
        const count = normalizeVoiceReferenceCount(rawCount);
        document.getElementById("rt-voice-count").value = String(count);
        const results = [];
        for (let i = 0; i < characterIds.length; i += 1) {
          if (batchOperationAborted) break;
          const charId = characterIds[i];
          const referenceSet = voiceReferencesByCharacter[charId];
          if (!referenceSet) continue;
          const targetName = referenceSet.characterName || charId;
          updateBatchProgress(i, characterIds.length, targetName);
          const character = characterFromReferenceSet(referenceSet, parentCharacter);
          try {
            let caption = cleanCaption(referenceSet.caption || "");
            let sampleText = cleanVoiceDesignSampleText(referenceSet.sampleText || "");
            if (!caption) {
              if (output) output.textContent = `(${i + 1}/${characterIds.length}) ${targetName}: 캡션 없음 → 캡션 먼저 생성...`;
              await generateCaptionForCharacter(character, charId, output);
              const updated = voiceReferencesByCharacter[charId];
              caption = cleanCaption(updated?.caption || "");
              sampleText = cleanVoiceDesignSampleText(updated?.sampleText || "");
            }
            if (!caption) throw new Error("캡션 생성 실패로 레퍼런스 생성 불가");
            if (!sampleText) sampleText = PREVIEW_TEXT;
            if (output) output.textContent = `(${i + 1}/${characterIds.length}) ${targetName}: 레퍼런스 ${count}개 생성 중...`;
            const result = await requestVoiceReferences(character, caption, count, sampleText);
            const newRefSet = mergeVoiceReferenceSet(
              voiceReferencesByCharacter[charId] || null,
              normalizeGeneratedVoiceReferences(result, character, caption, sampleText),
            );
            voiceReferencesByCharacter[charId] = newRefSet;
            await saveVoiceReferences();
            refreshVoiceExplorer();
            autoSelectUnusedReference(charId);
            await saveConfig({ ...readFormConfig(), voiceByCharacter: config.voiceByCharacter });
            results.push({ charId, name: targetName, status: "ok", refs: referenceItems(newRefSet).length });
          } catch (error) {
            addRuntimeLog("일괄 레퍼런스 생성 실패", { target: targetName, error: describeError(error) });
            results.push({ charId, name: targetName, status: "error", error: describeError(error) });
            if (output) output.textContent = `(${i + 1}/${characterIds.length}) ${targetName} 실패: ${describeError(error)}`;
          }
        }
        updateBatchProgress(batchOperationAborted ? results.length : characterIds.length, characterIds.length, "완료");
        const okCount = results.filter((r) => r.status === "ok").length;
        const errors = results.filter((r) => r.status === "error");
        if (output) output.textContent = [
          batchOperationAborted ? "일괄 레퍼런스 생성 중단됨." : "일괄 레퍼런스 생성 완료.",
          `성공: ${okCount}/${characterIds.length}`,
          ...results.filter((r) => r.status === "ok").map((r) => `- ${r.name}: ${r.refs}개`),
          ...errors.map((r) => `- ${r.name} 실패: ${r.error}`),
        ].join("\n");
        addRuntimeLog("일괄 레퍼런스 생성 완료", { total: characterIds.length, ok: okCount, errors: errors.length });
        setTimeout(() => updateBatchProgress(0, 0), 3000);
      });
    };

    const batchAutoSelectUnused = async () => {
      const characterIds = selectedLorebookCharacterIds();
      if (!characterIds.length) {
        writeStatus("자동 보이스 할당: 캐릭터를 먼저 선택하세요.");
        return;
      }
      await runSettingsTask(`자동 보이스 할당 (${characterIds.length}명)`, async () => {
        await saveConfig(readFormConfig());
        const output = document.getElementById("rt-voice-design-output");
        let changed = 0;
        for (let i = 0; i < characterIds.length; i += 1) {
          const charId = characterIds[i];
          updateBatchProgress(i, characterIds.length, voiceReferencesByCharacter[charId]?.characterName || charId);
          if (autoSelectUnusedReference(charId)) changed += 1;
        }
        if (changed) {
          await saveConfig({ ...readFormConfig(), voiceByCharacter: config.voiceByCharacter });
          refreshVoiceExplorer();
        }
        updateBatchProgress(characterIds.length, characterIds.length, "완료");
        if (output) output.textContent = [
          "미사용 레퍼런스 자동 선택 완료.",
          `${changed}/${characterIds.length}개 캐릭터에 새 보이스 할당.`,
          characterIds.filter((id) => !config.voiceByCharacter?.[id]).length
            ? `${characterIds.filter((id) => !config.voiceByCharacter?.[id]).length}개는 레퍼런스가 없어 할당하지 못했습니다.`
            : "",
        ].filter(Boolean).join("\n");
        addRuntimeLog("자동 보이스 할당 완료", { total: characterIds.length, changed });
        setTimeout(() => updateBatchProgress(0, 0), 3000);
      });
    };

    const batchSelectAll = (selectAll) => {
      document.querySelectorAll(".rt-tree-character").forEach((node) => {
        const charSelect = node.querySelector("summary .rt-character-select");
        if (charSelect instanceof HTMLInputElement && !charSelect.disabled) {
          charSelect.checked = selectAll;
          charSelect.indeterminate = false;
        }
        node.querySelectorAll(".rt-reference-select").forEach((ref) => {
          if (ref instanceof HTMLInputElement && !ref.disabled) {
            ref.checked = selectAll;
          }
        });
      });
      updateBatchButtonStates();
    };

    const wireExplorerControls = () => {
      if (typeof explorerDragWheelCleanup === "function") {
        explorerDragWheelCleanup();
        explorerDragWheelCleanup = null;
      }
      let draggedReference = null;
      let dragScrollTimer = null;
      let dragScrollVelocity = 0;
      const DRAG_SCROLL_ZONE = 82;
      const DRAG_SCROLL_MAX_STEP = 24;
      const clearDropTargets = () => {
        document.querySelectorAll(".rt-drop-target").forEach((node) => node.classList.remove("rt-drop-target"));
      };
      const stopDragScroll = () => {
        dragScrollVelocity = 0;
        if (dragScrollTimer) {
          globalThis.clearInterval(dragScrollTimer);
          dragScrollTimer = null;
        }
      };
      const explorerDragScrollInfo = (event) => {
        const tree = document.getElementById("rt-voice-explorer");
        if (!tree || !event) return { tree: null, inZone: false, velocity: 0 };
        const rect = tree.getBoundingClientRect();
        const y = Number(event.clientY || 0);
        const topDistance = y - rect.top;
        const bottomDistance = rect.bottom - y;
        let velocity = 0;
        if (topDistance >= 0 && topDistance < DRAG_SCROLL_ZONE) {
          const ratio = (DRAG_SCROLL_ZONE - topDistance) / DRAG_SCROLL_ZONE;
          velocity = -Math.max(6, Math.ceil(ratio * DRAG_SCROLL_MAX_STEP));
        } else if (bottomDistance >= 0 && bottomDistance < DRAG_SCROLL_ZONE) {
          const ratio = (DRAG_SCROLL_ZONE - bottomDistance) / DRAG_SCROLL_ZONE;
          velocity = Math.max(6, Math.ceil(ratio * DRAG_SCROLL_MAX_STEP));
        }
        return { tree, inZone: velocity !== 0, velocity };
      };
      const updateDragScroll = (event) => {
        const { tree, inZone, velocity } = explorerDragScrollInfo(event);
        if (!draggedReference || !tree || !inZone) {
          stopDragScroll();
          return false;
        }
        dragScrollVelocity = velocity;
        if (!dragScrollTimer) {
          dragScrollTimer = globalThis.setInterval(() => {
            const currentTree = document.getElementById("rt-voice-explorer");
            if (!draggedReference || !currentTree || !dragScrollVelocity) {
              stopDragScroll();
              return;
            }
            currentTree.scrollTop += dragScrollVelocity;
          }, 16);
        }
        return true;
      };
      const isInDragScrollZone = (event) => explorerDragScrollInfo(event).inZone;
      const dropTargetMeta = (node) => {
        const characterNode = node?.closest?.(".rt-tree-character");
        if (characterNode) {
          const bot = characterNode.closest(".rt-tree-bot");
          return {
            characterId: characterNode.dataset.characterId || "",
            characterName: characterNode.dataset.characterName || characterNode.dataset.characterId || "",
            botId: bot?.dataset.botId || "",
            botName: bot?.dataset.botName || "",
          };
        }
        return null;
      };
      let dragSourceCard = null;
      let referenceMoveBusy = false;
      let lastReferenceSelectionAnchor = null;
      let lastUnregisteredSelectionAnchor = null;
      const referencePayloadFromCard = (card) => ({
        sourceType: "registered",
        sourceCharacterId: card?.dataset.characterId || "",
        sourceCharacterName: card?.dataset.characterName || "",
        referenceIndex: Number(card?.dataset.referenceIndex || -1),
        voiceId: card?.dataset.voiceId || "",
      });
      const registeredMovePayloadFromRefs = (refs) => {
        const items = uniqueReferenceRefs(refs || []);
        const first = items[0] || {};
        return {
          sourceType: "registered",
          sourceCharacterId: items.length === 1 ? first.characterId || "" : "",
          sourceCharacterName: "",
          referenceIndex: items.length === 1 ? Number(first.referenceIndex ?? -1) : -1,
          voiceId: items.length === 1 ? first.voiceId || "" : "",
          refs: items,
        };
      };
      const unregisteredPayloadFromCard = (card) => ({
        sourceType: "unregistered",
        sourceCharacterId: "",
        sourceCharacterName: "미등록 레퍼런스",
        referenceIndex: -1,
        voiceId: card?.dataset.voiceId || "",
        voice: {
          voiceId: card?.dataset.voiceId || "",
          label: card?.dataset.label || card?.dataset.voiceId || "",
          file: card?.dataset.file || "",
          previewUrl: card?.dataset.previewUrl || "",
        },
      });
      const unregisteredMovePayloadFromVoices = (voices) => {
        const seen = new Set();
        const items = (Array.isArray(voices) ? voices : [])
          .filter((voice) => {
            const voiceId = String(voice?.voiceId || "").trim();
            if (!voiceId || seen.has(voiceId)) return false;
            seen.add(voiceId);
            return true;
          });
        const first = items[0] || {};
        return {
          sourceType: "unregistered",
          sourceCharacterId: "",
          sourceCharacterName: "미등록 레퍼런스",
          referenceIndex: -1,
          voiceId: items.length === 1 ? first.voiceId || "" : "",
          voice: first,
          voices: items,
        };
      };
      const referenceRefFromElement = (element) => ({
        characterId: element?.dataset.characterId || "",
        referenceIndex: Number(element?.dataset.referenceIndex ?? -1),
        voiceId: element?.dataset.voiceId || "",
      });
      const uniqueReferenceRefs = (refs) => {
        const seen = new Set();
        return refs.filter((ref) => {
          const key = `${ref.characterId}:${ref.voiceId || ref.referenceIndex}`;
          if (!ref.characterId || (!ref.voiceId && ref.referenceIndex < 0) || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };
      const selectedReferenceRefs = (fallbackRef = null) => {
        const checked = Array.from(document.querySelectorAll(".rt-reference-select:checked"))
          .map(referenceRefFromElement);
        return uniqueReferenceRefs(checked.length ? checked : (fallbackRef ? [fallbackRef] : []));
      };
      const unregisteredVoiceFromElement = (element) => {
        const card = element?.closest?.(".rt-unregistered-voice");
        return {
          voiceId: card?.dataset.voiceId || element?.dataset.voiceId || "",
          label: card?.dataset.label || card?.dataset.voiceId || element?.dataset.voiceId || "",
          file: card?.dataset.file || "",
          previewUrl: card?.dataset.previewUrl || "",
        };
      };
      const selectedUnregisteredVoices = (fallbackVoice = null) => {
        const seen = new Set();
        const selected = Array.from(document.querySelectorAll(".rt-unregistered-select:checked"))
          .map(unregisteredVoiceFromElement)
          .filter((voice) => {
            const voiceId = String(voice?.voiceId || "").trim();
            if (!voiceId || seen.has(voiceId)) return false;
            seen.add(voiceId);
            return true;
          });
        if (selected.length) return selected;
        const fallbackId = String(fallbackVoice?.voiceId || "").trim();
        return fallbackId ? [fallbackVoice] : [];
      };
      const movePayloadRefs = (payload) => {
        if (Array.isArray(payload?.refs) && payload.refs.length) {
          return uniqueReferenceRefs(payload.refs);
        }
        if (payload?.sourceType === "registered") {
          return uniqueReferenceRefs([{
            characterId: payload.sourceCharacterId || "",
            referenceIndex: Number(payload.referenceIndex ?? -1),
            voiceId: payload.voiceId || "",
          }]);
        }
        return [];
      };
      const movePayloadVoices = (payload) => {
        if (Array.isArray(payload?.voices) && payload.voices.length) {
          return unregisteredMovePayloadFromVoices(payload.voices).voices;
        }
        return payload?.voice?.voiceId ? [payload.voice] : [];
      };
      const movePayloadCount = (payload) => payload?.sourceType === "unregistered"
        ? movePayloadVoices(payload).length
        : movePayloadRefs(payload).length;
      const isSameMovePayload = (left, right) => {
        if (!left || !right || left.sourceType !== right.sourceType) return false;
        if (left.sourceType === "unregistered") {
          const leftIds = movePayloadVoices(left).map((voice) => voice.voiceId).sort();
          const rightIds = movePayloadVoices(right).map((voice) => voice.voiceId).sort();
          return leftIds.length === rightIds.length && leftIds.every((id, index) => id === rightIds[index]);
        }
        const leftKeys = movePayloadRefs(left).map((ref) => `${ref.characterId}:${ref.voiceId || ref.referenceIndex}`).sort();
        const rightKeys = movePayloadRefs(right).map((ref) => `${ref.characterId}:${ref.voiceId || ref.referenceIndex}`).sort();
        return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index]);
      };
      const movePayloadCanDropOnTarget = (payload, targetCharacterId) => {
        if (!payload || !targetCharacterId) return false;
        if (payload.sourceType === "unregistered") return movePayloadVoices(payload).length > 0;
        const refs = movePayloadRefs(payload);
        return refs.some((ref) => ref.characterId && ref.characterId !== targetCharacterId);
      };
      const selectedCharacterDeleteRefs = (fallbackCharacterId = "") => {
        const checkedIds = Array.from(document.querySelectorAll(".rt-character-select:checked"))
          .map((input) => input.dataset.characterId || "")
          .filter(Boolean);
        const ids = checkedIds.length ? checkedIds : (fallbackCharacterId ? [fallbackCharacterId] : []);
        const seen = new Set();
        return ids.map((id) => {
          const referenceSet = voiceReferencesByCharacter[id];
          return {
            characterId: id,
            referenceSet,
            name: referenceSet?.characterName || id,
          };
        }).filter((item) => {
          const deletable = item.characterId
            && !seen.has(item.characterId)
            && item.characterId !== characterId
            && Boolean(item.referenceSet?.lorebookCharacter);
          if (deletable) seen.add(item.characterId);
          return deletable;
        });
      };
      const renderedReferenceCountForCharacter = (characterId) => {
        if (!characterId) return 0;
        const node = Array.from(document.querySelectorAll(".rt-tree-character"))
          .find((item) => item.dataset.characterId === characterId);
        return node ? node.querySelectorAll(".rt-tree-reference").length : 0;
      };
      const characterVoiceRecordMeta = (item) => {
        const references = referenceItems(item.referenceSet)
          .filter((reference) => reference && (reference.voiceId || reference.file || reference.url || reference.label));
        const referenceCount = Math.max(references.length, renderedReferenceCountForCharacter(item.characterId));
        const hasSelectedVoice = Boolean(config.voiceByCharacter?.[item.characterId]);
        return {
          name: item.name,
          referenceCount,
          hasSelectedVoice,
          hasVoiceRecord: referenceCount > 0 || hasSelectedVoice,
        };
      };
      const syncCharacterSelectionStates = () => {
        document.querySelectorAll(".rt-tree-character").forEach((node) => {
          const characterSelect = node.querySelector("summary .rt-character-select");
          if (!characterSelect) return;
          const referenceSelects = Array.from(node.querySelectorAll(".rt-reference-select"))
            .filter((input) => !input.disabled);
          const checkedCount = referenceSelects.filter((input) => input.checked).length;
          const canDeleteCharacter = node.dataset.canDelete === "1";
          characterSelect.disabled = referenceSelects.length === 0 && !canDeleteCharacter;
          if (referenceSelects.length > 0) {
            characterSelect.checked = checkedCount === referenceSelects.length;
            characterSelect.indeterminate = checkedCount > 0 && checkedCount < referenceSelects.length;
          } else {
            characterSelect.indeterminate = false;
          }
        });
      };
      const syncUnregisteredSelectionState = () => {
        const all = document.getElementById("rt-unregistered-select-all");
        const deleteButton = document.getElementById("rt-delete-selected-unregistered");
        const selects = Array.from(document.querySelectorAll(".rt-unregistered-select"))
          .filter((input) => !input.disabled);
        const checkedCount = selects.filter((input) => input.checked).length;
        if (all) {
          all.disabled = selects.length === 0;
          all.checked = selects.length > 0 && checkedCount === selects.length;
          all.indeterminate = checkedCount > 0 && checkedCount < selects.length;
        }
        if (deleteButton) {
          deleteButton.disabled = checkedCount === 0;
        }
      };
      const applyShiftSelectionRange = ({
        event,
        checkbox,
        anchor,
        selector,
        container,
        sync,
      }) => {
        const root = container || document;
        const inputs = Array.from(root.querySelectorAll(selector))
          .filter((input) => !input.disabled);
        const currentIndex = inputs.indexOf(checkbox);
        const anchorIndex = inputs.indexOf(anchor);
        if (!event?.shiftKey || currentIndex < 0 || anchorIndex < 0 || anchor === checkbox) {
          sync?.();
          return false;
        }
        const start = Math.min(anchorIndex, currentIndex);
        const end = Math.max(anchorIndex, currentIndex);
        const checked = Boolean(checkbox.checked);
        inputs.slice(start, end + 1).forEach((input) => {
          input.checked = checked;
        });
        sync?.();
        return true;
      };
      const resolveReferenceRef = (ref) => {
        const referenceSet = voiceReferencesByCharacter[ref.characterId];
        const references = [...referenceItems(referenceSet)];
        let index = Number(ref.referenceIndex);
        if (!Number.isInteger(index) || references[index]?.voiceId !== ref.voiceId) {
          index = references.findIndex((reference) => (reference.voiceId || "") === ref.voiceId);
        }
        if (index < 0 || !references[index]) return null;
        return {
          characterId: ref.characterId,
          referenceSet,
          references,
          index,
          reference: references[index],
        };
      };
      const saveReferenceList = (characterId, referenceSet, references) => {
        voiceReferencesByCharacter[characterId] = references.length ? {
          ...referenceSet,
          references,
        } : clearReferenceDraftMetadata({
          ...referenceSet,
          references: [],
        });
      };
      const alertLockedReferences = (lockedReferences) => {
        const message = [
          "삭제 잠금이 켜진 레퍼런스가 포함되어 있어 삭제할 수 없습니다.",
          "잠금을 해제한 뒤 다시 시도하세요.",
          "",
          ...lockedReferences.map((item) => `- ${item.reference.voiceId || item.reference.label || "이름 없는 레퍼런스"}`),
        ].join("\n");
        if (typeof globalThis.alert === "function") {
          globalThis.alert(message);
        }
        writeStatus(message);
      };
      const targetSummaryAtPoint = (event) => {
        const doc = rootDoc || document;
        const element = doc.elementFromPoint?.(Number(event.clientX || 0), Number(event.clientY || 0));
        const summary = element?.closest?.(".rt-tree-bot > summary, .rt-tree-character > summary") || null;
        const tree = document.getElementById("rt-voice-explorer");
        return tree && summary && tree.contains(summary) ? summary : null;
      };
      const highlightedDropTarget = (event) => {
        const summary = targetSummaryAtPoint(event);
        const target = dropTargetMeta(summary);
        if (!summary || !target?.characterId || !draggedReference
          || !movePayloadCanDropOnTarget(draggedReference, target.characterId)) {
          clearDropTargets();
          return null;
        }
        if (updateDragScroll(event) || isInDragScrollZone(event)) {
          clearDropTargets();
          return null;
        }
        clearDropTargets();
        const targetNode = summary.closest(".rt-tree-character") || summary.closest(".rt-tree-bot");
        targetNode?.classList.add("rt-drop-target");
        return { summary, target };
      };
      const clearReferenceDrag = () => {
        dragSourceCard?.classList.remove("dragging");
        draggedReference = null;
        dragSourceCard = null;
        referenceMoveBusy = false;
        stopDragScroll();
        clearDropTargets();
      };
      const moveDraggedReferenceToTarget = async (payload, target) => {
        if (!payload || !target?.characterId || referenceMoveBusy) {
          return;
        }
        if (!movePayloadCanDropOnTarget(payload, target.characterId)) {
          clearReferenceDrag();
          writeStatus("같은 캐릭터에는 레퍼런스를 옮길 수 없습니다. 레퍼런스 이동을 취소했습니다.");
          return;
        }
        referenceMoveBusy = true;
        const endTask = beginSettingsTask("레퍼런스 이동");
        try {
          await saveConfig(readFormConfig());
          const results = [];
          let skippedSameTarget = 0;
          if (payload.sourceType === "unregistered") {
            for (const voice of movePayloadVoices(payload)) {
              results.push(await registerUnregisteredVoiceToTarget(voice, target));
            }
          } else {
            for (const ref of movePayloadRefs(payload)) {
              if (ref.characterId === target.characterId) {
                skippedSameTarget += 1;
                continue;
              }
              results.push(await moveVoiceReferenceBetweenCharacters(
                ref.characterId,
                ref.referenceIndex,
                ref.voiceId,
                target,
              ));
            }
          }
          const movedResults = results.filter((result) => result?.moved);
          const duplicateCount = movedResults.filter((result) => result.alreadyExists).length;
          activeVoiceBotId = target.botId || activeVoiceBotId;
          activeVoiceBotName = target.botName || activeVoiceBotName;
          activeVoiceCharacterId = target.characterId || activeVoiceCharacterId;
          clearReferenceDrag();
          refreshVoiceExplorer();
          if (movedResults.length === 1 && movePayloadCount(payload) === 1) {
            const result = movedResults[0];
            writeStatus([
              `${result.voiceId} 레퍼런스를 ${result.sourceName}에서 ${result.targetName}로 옮겼습니다.`,
              result.alreadyExists ? "대상 캐릭터에 같은 레퍼런스가 이미 있어 중복 추가는 하지 않았습니다." : "",
              "사용하려면 옮긴 레퍼런스의 사용 버튼을 눌러주세요.",
            ].filter(Boolean).join("\n"));
          } else {
            writeStatus([
              `${target.characterName || target.characterId}로 레퍼런스 ${movedResults.length}개를 옮겼습니다.`,
              duplicateCount ? `이미 있던 레퍼런스 ${duplicateCount}개는 중복 추가하지 않았습니다.` : "",
              skippedSameTarget ? `같은 캐릭터에 있던 레퍼런스 ${skippedSameTarget}개는 건너뛰었습니다.` : "",
              "사용하려면 옮긴 레퍼런스의 사용 버튼을 눌러주세요.",
            ].filter(Boolean).join("\n"));
          }
        } catch (error) {
          clearReferenceDrag();
          writeStatus(`레퍼런스 이동 실패: ${describeError(error)}`);
        } finally {
          endTask();
        }
      };
      const dragWheelScrollHandler = (event) => {
        if (!draggedReference) return;
        const tree = document.getElementById("rt-voice-explorer");
        if (!tree) return;
        let delta = Number(event.deltaY || 0);
        if (!delta) return;
        if (event.deltaMode === 1) {
          delta *= 18;
        } else if (event.deltaMode === 2) {
          delta *= Math.max(120, tree.clientHeight * 0.8);
        }
        const step = Math.sign(delta) * Math.min(240, Math.max(24, Math.abs(delta)));
        tree.scrollTop += step;
        stopDragScroll();
        clearDropTargets();
        event.preventDefault();
        event.stopPropagation();
      };

      document.querySelectorAll(".rt-move-explorer-voice").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const card = button.closest(".rt-tree-reference");
          const clickedRef = referenceRefFromElement(button);
          const rowChecked = Boolean(card?.querySelector?.(".rt-reference-select")?.checked);
          const refs = rowChecked ? selectedReferenceRefs(clickedRef) : uniqueReferenceRefs([clickedRef]);
          const payload = registeredMovePayloadFromRefs(refs);
          if (!movePayloadCount(payload)) {
            writeStatus("이동할 레퍼런스를 찾지 못했습니다.");
            return;
          }
          if (isSameMovePayload(draggedReference, payload)) {
            clearReferenceDrag();
            writeStatus("레퍼런스 이동을 취소했습니다.");
            return;
          }
          clearReferenceDrag();
          draggedReference = payload;
          dragSourceCard = card;
          dragSourceCard?.classList.add("dragging");
          const count = movePayloadCount(draggedReference);
          writeStatus(count > 1
            ? `레퍼런스 ${count}개 이동 모드입니다. 휠로 스크롤한 뒤 대상 캐릭터 줄을 클릭하세요. 취소하려면 Esc를 누르세요.`
            : `레퍼런스 ${draggedReference.voiceId || refs[0]?.voiceId || ""} 이동 모드입니다. 휠로 스크롤한 뒤 대상 캐릭터 줄을 클릭하세요. 취소하려면 Esc를 누르세요.`);
        });
      });
      document.querySelectorAll(".rt-move-unregistered-voice").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const card = button.closest(".rt-unregistered-voice");
          const fallbackPayload = unregisteredPayloadFromCard(card);
          const rowChecked = Boolean(card?.querySelector?.(".rt-unregistered-select")?.checked);
          const voices = rowChecked ? selectedUnregisteredVoices(fallbackPayload.voice) : [fallbackPayload.voice];
          const payload = unregisteredMovePayloadFromVoices(voices);
          if (!movePayloadCount(payload)) {
            writeStatus("이동할 미등록 레퍼런스를 찾지 못했습니다.");
            return;
          }
          if (isSameMovePayload(draggedReference, payload)) {
            clearReferenceDrag();
            writeStatus("미등록 레퍼런스 이동을 취소했습니다.");
            return;
          }
          clearReferenceDrag();
          draggedReference = payload;
          dragSourceCard = card;
          dragSourceCard?.classList.add("dragging");
          const count = movePayloadCount(draggedReference);
          writeStatus(count > 1
            ? `미등록 레퍼런스 ${count}개 이동 모드입니다. 대상 캐릭터 줄을 클릭하면 그 캐릭터의 레퍼런스로 등록됩니다.`
            : `미등록 레퍼런스 ${draggedReference.voiceId || voices[0]?.voiceId || ""} 이동 모드입니다. 대상 캐릭터 줄을 클릭하면 그 캐릭터의 레퍼런스로 등록됩니다.`);
        });
      });
      document.querySelector(".rt-unregistered-check-all")?.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      document.querySelector(".rt-unregistered-references")?.addEventListener("toggle", (event) => {
        unregisteredReferencesOpen = Boolean(event.currentTarget.open);
      });
      document.getElementById("rt-unregistered-select-all")?.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      document.getElementById("rt-unregistered-select-all")?.addEventListener("change", (event) => {
        event.stopPropagation();
        const checked = Boolean(event.currentTarget.checked);
        document.querySelectorAll(".rt-unregistered-select").forEach((input) => {
          if (!input.disabled) input.checked = checked;
        });
        lastUnregisteredSelectionAnchor = null;
        syncUnregisteredSelectionState();
      });
      document.getElementById("rt-delete-selected-unregistered")?.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const voices = selectedUnregisteredVoices();
        if (!voices.length) {
          writeStatus("삭제할 미등록 레퍼런스를 선택하세요.");
          return;
        }
        const confirmed = await requestDangerConfirm({
          title: "미등록 레퍼런스 삭제",
          lines: [
            `삭제 대상 미등록 레퍼런스: ${voices.length}개`,
            ...voices.map((voice) => `- ${voice.voiceId}`),
            "voices 폴더의 wav 파일을 실제로 삭제합니다.",
            "파일 삭제에는 보이스 레퍼런스 Helper가 필요합니다.",
          ],
        });
        if (!confirmed) return;
        const endTask = beginSettingsTask("미등록 레퍼런스 삭제");
        try {
          const result = await deleteUnregisteredVoiceFiles(voices);
          refreshVoiceExplorer();
          writeStatus([
            `${result.removedVoiceIds.length}개 미등록 레퍼런스를 삭제했습니다.`,
            result.fileDeletedCount ? `voices 폴더 wav 파일 ${result.fileDeletedCount}개를 삭제했습니다.` : "",
            result.fileAlreadyMissingCount ? `이미 없던 wav 파일: ${result.fileAlreadyMissingCount}개` : "",
          ].filter(Boolean).join("\n"));
        } catch (error) {
          writeStatus(`미등록 레퍼런스 삭제 실패: ${describeError(error)}`);
        } finally {
          endTask();
        }
      });
      document.querySelectorAll(".rt-unregistered-select").forEach((checkbox) => {
        checkbox.addEventListener("click", (event) => {
          event.stopPropagation();
          const ranged = applyShiftSelectionRange({
            event,
            checkbox,
            anchor: lastUnregisteredSelectionAnchor,
            selector: ".rt-unregistered-select",
            container: document.querySelector(".rt-unregistered-references") || document,
            sync: syncUnregisteredSelectionState,
          });
          lastUnregisteredSelectionAnchor = checkbox;
          if (ranged) {
            const selectedCount = document.querySelectorAll(".rt-unregistered-select:checked").length;
            writeStatus(`미등록 레퍼런스 ${selectedCount}개를 선택했습니다.`);
          }
        });
        checkbox.addEventListener("change", (event) => {
          event.stopPropagation();
          syncUnregisteredSelectionState();
        });
      });
      document.querySelectorAll(".rt-delete-unregistered-voice").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const fallbackVoice = unregisteredVoiceFromElement(button);
          const voices = selectedUnregisteredVoices(fallbackVoice);
          if (!voices.length) {
            writeStatus("삭제할 미등록 레퍼런스를 찾지 못했습니다.");
            return;
          }
          const confirmed = await requestDangerConfirm({
            title: voices.length > 1 ? "미등록 레퍼런스 일괄 삭제" : "미등록 레퍼런스 삭제",
            lines: [
              voices.length > 1
                ? `삭제 대상 미등록 레퍼런스: ${voices.length}개`
                : `삭제 대상 미등록 레퍼런스: ${voices[0].voiceId}`,
              ...voices.map((voice) => `- ${voice.voiceId}`),
              "voices 폴더의 wav 파일을 실제로 삭제합니다.",
              "파일 삭제에는 보이스 레퍼런스 Helper가 필요합니다.",
            ],
          });
          if (!confirmed) return;
          const endTask = beginSettingsTask("미등록 레퍼런스 삭제");
          try {
            const result = await deleteUnregisteredVoiceFiles(voices);
            refreshVoiceExplorer();
            writeStatus([
              `${result.removedVoiceIds.length}개 미등록 레퍼런스를 삭제했습니다.`,
              result.fileDeletedCount ? `voices 폴더 wav 파일 ${result.fileDeletedCount}개를 삭제했습니다.` : "",
              result.fileAlreadyMissingCount ? `이미 없던 wav 파일: ${result.fileAlreadyMissingCount}개` : "",
            ].filter(Boolean).join("\n"));
          } catch (error) {
            writeStatus(`미등록 레퍼런스 삭제 실패: ${describeError(error)}`);
          } finally {
            endTask();
          }
        });
      });
      const moveReferenceToSummaryTarget = async (event, summary) => {
        if (!draggedReference || referenceMoveBusy) return false;
        const target = dropTargetMeta(summary);
        if (!target?.characterId) return false;
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if (!movePayloadCanDropOnTarget(draggedReference, target.characterId)) {
          clearReferenceDrag();
          writeStatus("같은 캐릭터에는 레퍼런스를 옮길 수 없습니다. 레퍼런스 이동을 취소했습니다.");
          return true;
        }
        await moveDraggedReferenceToTarget(draggedReference, target);
        return true;
      };

      const explorer = document.getElementById("rt-voice-explorer");
      if (explorer) {
        const doc = rootDoc || document;
        const pointerMoveHandler = (event) => {
          if (!draggedReference || referenceMoveBusy) return;
          highlightedDropTarget(event);
        };
        const clickDropHandler = async (event) => {
          if (!draggedReference || referenceMoveBusy) return;
          const summary = targetSummaryAtPoint(event);
          const target = dropTargetMeta(summary);
          if (!summary || !target?.characterId) return;
          if (!movePayloadCanDropOnTarget(draggedReference, target.characterId)) return;
          event.preventDefault();
          event.stopPropagation();
          await moveDraggedReferenceToTarget(draggedReference, target);
        };
        const keydownHandler = (event) => {
            if (!draggedReference || event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            clearReferenceDrag();
            writeStatus("레퍼런스 이동을 취소했습니다.");
          };
        explorer.addEventListener("wheel", dragWheelScrollHandler, { passive: false });
        doc.addEventListener("pointermove", pointerMoveHandler, { capture: true });
        doc.addEventListener("click", clickDropHandler, true);
        doc.addEventListener("keydown", keydownHandler, true);
        doc.addEventListener("wheel", dragWheelScrollHandler, { passive: false, capture: true });
        explorerDragWheelCleanup = () => {
          explorer.removeEventListener("wheel", dragWheelScrollHandler);
          doc.removeEventListener("pointermove", pointerMoveHandler, true);
          doc.removeEventListener("click", clickDropHandler, true);
          doc.removeEventListener("keydown", keydownHandler, true);
          doc.removeEventListener("wheel", dragWheelScrollHandler, true);
          clearReferenceDrag();
        };
      }

      document.querySelectorAll(".rt-tree-bot > summary").forEach((summary) => {
        summary.addEventListener("click", async (event) => {
          if (await moveReferenceToSummaryTarget(event, summary)) return;
          const item = summary.closest(".rt-tree-bot");
          const targetBotId = item?.dataset.botId || characterId;
          const targetBotName = item?.dataset.botName || targetBotId;
          const targetCharacterId = item?.dataset.defaultCharacterId || targetBotId;
          activeVoiceBotId = targetBotId;
          activeVoiceBotName = targetBotName;
          activeVoiceCharacterId = targetCharacterId;
          document.querySelectorAll(".rt-tree-character.active").forEach((node) => node.classList.remove("active"));
          document.querySelectorAll(".rt-tree-bot.active").forEach((node) => {
            if (node !== item) node.classList.remove("active");
          });
          item?.classList.add("active");
          writeStatus(`선택된 캐릭터: ${selectedCharacterName()}`);
        });
      });

      document.querySelectorAll(".rt-delete-bot").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const botId = button.dataset.botId || "";
          const botName = button.dataset.botName || botId;
          const characterCount = Number(button.dataset.characterCount || 0);
          const isCurrentBotDelete = botId === characterId;
          if (!botId || botId === GLOBAL_BOT_ID) {
            writeStatus("이 봇 폴더는 삭제할 수 없습니다.");
            return;
          }

          const targetEntries = Object.entries(voiceReferencesByCharacter || {})
            .filter(([key, referenceSet]) => key === botId || referenceSet?.botId === botId);
          const lockedReferences = [];
          const targetCharacterIds = new Set();
          let referenceCount = 0;
          targetEntries.forEach(([key, referenceSet]) => {
            targetCharacterIds.add(key);
            if (referenceSet?.characterId) targetCharacterIds.add(referenceSet.characterId);
            referenceItems(referenceSet).forEach((reference) => {
              if (!reference || !(reference.voiceId || reference.file || reference.url || reference.label)) return;
              referenceCount += 1;
              if (reference.locked) {
                lockedReferences.push({
                  characterId: key,
                  name: referenceSet?.characterName || key,
                  reference,
                });
              }
            });
          });
          if (lockedReferences.length) {
            alertLockedReferences(lockedReferences);
            return;
          }
          const selectedVoiceCount = Array.from(targetCharacterIds)
            .filter((id) => Boolean(config.voiceByCharacter?.[id]))
            .length;
          const confirmed = await requestDangerConfirm({
            title: "봇 폴더 삭제",
            lines: [
              `삭제 대상 봇: ${botName}`,
              isCurrentBotDelete ? "이 봇은 현재 열려 있는 봇입니다." : "",
              characterCount > 0 ? `${botName} 봇 폴더에는 ${characterCount}개의 캐릭터 항목이 있습니다.` : "",
              referenceCount > 0 ? `보이스 레퍼런스 ${referenceCount}개의 탐색기 기록을 정리합니다.` : "",
              selectedVoiceCount > 0 ? `캐릭터별 선택 보이스 기록 ${selectedVoiceCount}개가 함께 정리됩니다.` : "",
              `현재 메타데이터 프로필(${metadataProfileLabel(config.metadataProfileId)})에서만 삭제합니다.`,
              "voices 폴더의 wav 파일은 삭제하지 않습니다.",
              `계속하려면 아래 문구를 그대로 입력하세요.`,
            ].filter(Boolean),
            confirmText: DELETE_BOT_CONFIRM_TEXT,
          });
          if (!confirmed) {
            writeStatus("봇 폴더 삭제를 취소했습니다.");
            return;
          }

          const endTask = beginSettingsTask("봇 폴더 삭제");
          try {
          const removedCharacterIds = new Set();
          let removedSetCount = 0;
          for (const [key, referenceSet] of Object.entries(voiceReferencesByCharacter || {})) {
            const belongsToBot = key === botId || referenceSet?.botId === botId;
            if (!belongsToBot) continue;
            removedCharacterIds.add(key);
            if (referenceSet?.characterId) removedCharacterIds.add(referenceSet.characterId);
            delete voiceReferencesByCharacter[key];
            removedSetCount += 1;
          }

          const voiceByCharacter = { ...config.voiceByCharacter };
          for (const removedId of removedCharacterIds) {
            delete voiceByCharacter[removedId];
          }
          const hiddenBotIds = Array.from(new Set([...(config.hiddenBotIds || []), botId]));
          const hiddenBotNames = { ...(config.hiddenBotNames || {}), [botId]: botName };

          if (activeVoiceBotId === botId || removedCharacterIds.has(activeVoiceCharacterId)) {
            activeVoiceBotId = hasCurrentCharacter ? characterId : GLOBAL_BOT_ID;
            activeVoiceBotName = hasCurrentCharacter ? characterName : GLOBAL_BOT_NAME;
            activeVoiceCharacterId = hasCurrentCharacter ? characterId : GLOBAL_NARRATION_ID;
          }

          await saveConfig({ ...readFormConfig(), voiceByCharacter, hiddenBotIds, hiddenBotNames });
          await saveVoiceReferences();
          refreshVoiceExplorer();
          writeStatus([
            `${botName} 봇 폴더를 현재 프로필에서 삭제했습니다.`,
            `정리한 캐릭터 기록: ${removedSetCount}개`,
            "voices 폴더 wav 파일은 삭제하지 않았습니다.",
          ].filter(Boolean).join("\n"));
          } finally {
            endTask();
          }
        });
      });

      document.querySelectorAll(".rt-restore-hidden-bot").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const botId = button.dataset.botId || "";
          if (!botId) return;
          const botName = config.hiddenBotNames?.[botId] || botId;
          const { hiddenBotIds, hiddenBotNames } = withoutHiddenBot(botId);
          await saveConfig({ ...readFormConfig(), hiddenBotIds, hiddenBotNames });
          if (activeVoiceBotId === botId) {
            activeVoiceBotName = botName;
          }
          refreshVoiceExplorer();
          writeStatus(`${botName} 봇 폴더를 숨김 목록에서 복원했습니다.`);
        });
      });

      document.querySelectorAll(".rt-tree-character > summary").forEach((summary) => {
        summary.addEventListener("click", async (event) => {
          if (await moveReferenceToSummaryTarget(event, summary)) return;
          const item = summary.closest(".rt-tree-character");
          const bot = item?.closest(".rt-tree-bot");
          const targetCharacterId = item?.dataset.characterId || (hasCurrentCharacter ? characterId : GLOBAL_NARRATION_ID);
          activeVoiceBotId = bot?.dataset.botId || (hasCurrentCharacter ? characterId : GLOBAL_BOT_ID);
          activeVoiceBotName = bot?.dataset.botName || (hasCurrentCharacter ? characterName : GLOBAL_BOT_NAME);
          activeVoiceCharacterId = targetCharacterId;
          document.querySelectorAll(".rt-tree-bot.active").forEach((node) => {
            if (node !== bot) node.classList.remove("active");
          });
          bot?.classList.add("active");
          document.querySelectorAll(".rt-tree-character.active").forEach((node) => {
            if (node !== item) node.classList.remove("active");
          });
          item?.classList.add("active");
          writeStatus(`선택된 캐릭터: ${selectedCharacterName()}`);
        });
      });

      document.querySelectorAll(".rt-character-select").forEach((checkbox) => {
        checkbox.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        checkbox.addEventListener("change", (event) => {
          event.stopPropagation();
          const node = checkbox.closest(".rt-tree-character");
          const referenceSelects = Array.from(node?.querySelectorAll(".rt-reference-select") || [])
            .filter((input) => !input.disabled);
          referenceSelects.forEach((input) => {
            input.checked = checkbox.checked;
          });
          lastReferenceSelectionAnchor = null;
          checkbox.indeterminate = false;
          syncCharacterSelectionStates();
          updateBatchButtonStates();
          const name = node?.dataset.characterName || "캐릭터";
          writeStatus(`${name} 레퍼런스 ${checkbox.checked ? "전체 선택" : "선택 해제"}: ${referenceSelects.length}개`);
        });
      });

      document.querySelectorAll(".rt-reference-select").forEach((checkbox) => {
        checkbox.addEventListener("click", (event) => {
          event.stopPropagation();
          const characterNode = checkbox.closest(".rt-tree-character");
          const ranged = applyShiftSelectionRange({
            event,
            checkbox,
            anchor: lastReferenceSelectionAnchor,
            selector: ".rt-reference-select",
            container: characterNode || document,
            sync: syncCharacterSelectionStates,
          });
          lastReferenceSelectionAnchor = checkbox;
          if (ranged) {
            const selectedCount = characterNode
              ? characterNode.querySelectorAll(".rt-reference-select:checked").length
              : document.querySelectorAll(".rt-reference-select:checked").length;
            const name = characterNode?.dataset.characterName || "캐릭터";
            writeStatus(`${name} 레퍼런스 ${selectedCount}개를 선택했습니다.`);
          }
        });
        checkbox.addEventListener("change", () => {
          syncCharacterSelectionStates();
          updateBatchButtonStates();
        });
      });
      syncCharacterSelectionStates();
      updateBatchButtonStates();
      syncUnregisteredSelectionState();

      document.querySelectorAll(".rt-folder-select-all").forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          event.preventDefault();
          const action = btn.dataset.action || "select";
          const doSelect = (action === "select");
          const parentDetails = btn.closest("details");
          if (!parentDetails) return;
          parentDetails.querySelectorAll(".rt-character-select").forEach((charSelect) => {
            if (charSelect instanceof HTMLInputElement && !charSelect.disabled && charSelect.dataset.characterId) {
              const ref = voiceReferencesByCharacter[charSelect.dataset.characterId];
              const isLorebookCharacter = Boolean(ref?.lorebookCharacter);
              if (isLorebookCharacter) {
                charSelect.checked = doSelect;
                charSelect.indeterminate = false;
                const charNode = charSelect.closest(".rt-tree-character");
                charNode?.querySelectorAll(".rt-reference-select").forEach((refSel) => {
                  if (refSel instanceof HTMLInputElement && !refSel.disabled) refSel.checked = doSelect;
                });
              }
            }
          });
          syncCharacterSelectionStates();
          updateBatchButtonStates();
          const nameEl = parentDetails.querySelector(".rt-tree-name");
          const name = nameEl?.textContent || "폴더";
          writeStatus(`${name} 캐릭터 ${doSelect ? "전체 선택" : "전체 해제"}`);
        });
      });

      document.querySelectorAll(".rt-match-keys-input").forEach((input) => {
        input.addEventListener("change", async () => {
          const targetCharacterId = input.dataset.characterId || "";
          const referenceSet = voiceReferencesByCharacter[targetCharacterId];
          if (!targetCharacterId || !referenceSet) {
            writeStatus("매칭 키를 저장할 캐릭터를 찾지 못했습니다.");
            return;
          }
          const characterName = referenceSet.characterName || referenceSet.characterProfile?.name || targetCharacterId;
          const aliases = parseMatchKeyInput(input.value, characterName);
          const profile = referenceSet.characterProfile || {};
          voiceReferencesByCharacter[targetCharacterId] = {
            ...referenceSet,
            characterProfile: {
              ...profile,
              name: characterName,
              aliases,
            },
          };
          await saveVoiceReferences();
          input.value = matchKeyInputValue(voiceReferencesByCharacter[targetCharacterId], characterName);
          writeStatus(`${characterName} 매칭 키를 저장했습니다.`);
        });
      });

      document.querySelectorAll(".rt-color-character").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const targetCharacterId = button.dataset.characterId || "";
          const referenceSet = voiceReferencesByCharacter[targetCharacterId];
          if (!targetCharacterId || !referenceSet) {
            writeStatus("색상을 바꿀 캐릭터를 찾지 못했습니다.");
            return;
          }

          const characterName = referenceSet.characterName || referenceSet.characterProfile?.name || button.dataset.characterName || targetCharacterId;
          const currentColor = characterColorFromReferenceSet(referenceSet, targetCharacterId, characterName);
          const nextColor = await requestCharacterColor({
            title: `${characterName} 색상 선택`,
            currentColor,
          });
          if (!nextColor || nextColor === currentColor) return;

          voiceReferencesByCharacter[targetCharacterId] = {
            ...referenceSet,
            displayColor: nextColor,
          };
          await saveVoiceReferences();
          refreshVoiceExplorer();
          writeStatus(`${characterName} 색상을 저장했습니다.`);
        });
      });

      document.querySelectorAll(".rt-rename-lorebook-character").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const targetCharacterId = button.dataset.characterId || "";
          const referenceSet = voiceReferencesByCharacter[targetCharacterId];
          if (!targetCharacterId || !referenceSet?.lorebookCharacter) {
            writeStatus("이름을 바꿀 로어북 캐릭터를 찾지 못했습니다.");
            return;
          }

          const previousName = referenceSet.characterName || referenceSet.characterProfile?.name || "";
          const input = typeof globalThis.prompt === "function"
            ? globalThis.prompt("보이스 탐색기에 표시할 캐릭터 이름을 입력하세요.", previousName)
            : null;
          if (input == null) return;
          const nextName = normalizeLoreCandidateName(input);
          if (!nextName || isBadLoreCandidateName(nextName, "")) {
            writeStatus("캐릭터 이름으로 쓰기 어려운 값입니다.");
            return;
          }
          if (nextName === previousName) {
            writeStatus("캐릭터 이름이 그대로입니다.");
            return;
          }

          const profile = referenceSet.characterProfile || {};
          voiceReferencesByCharacter[targetCharacterId] = {
            ...referenceSet,
            characterName: nextName,
            characterProfile: {
              ...profile,
              name: nextName,
              aliases: defaultMatchKeysForCharacter(nextName, mergeAliases(profile.aliases || [], [previousName])),
            },
          };
          await saveVoiceReferences();
          refreshVoiceExplorer();
          writeStatus(`캐릭터 이름을 ${previousName}에서 ${nextName}로 바꿨습니다.`);
        });
      });

      document.querySelectorAll(".rt-delete-lorebook-character").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const targetCharacterId = button.dataset.characterId || "";
          const deleteRefs = selectedCharacterDeleteRefs(targetCharacterId);
          if (!deleteRefs.length) {
            writeStatus("삭제할 로어북 캐릭터 항목을 찾지 못했습니다.");
            return;
          }
          const lockedReferences = [];
          deleteRefs.forEach((item) => {
            referenceItems(item.referenceSet).forEach((reference) => {
              if (reference?.locked) {
                lockedReferences.push({ ...item, reference });
              }
            });
          });
          if (lockedReferences.length) {
            alertLockedReferences(lockedReferences);
            return;
          }
          const plural = deleteRefs.length > 1;
          const voiceRecordMeta = deleteRefs.map(characterVoiceRecordMeta);
          const totalReferenceCount = voiceRecordMeta.reduce((sum, item) => sum + item.referenceCount, 0);
          const hasVoiceRecord = voiceRecordMeta.some((item) => item.hasVoiceRecord);
          const confirmed = await requestDangerConfirm({
            title: plural ? "캐릭터 항목 일괄 삭제" : "캐릭터 항목 삭제",
            lines: [
              plural ? `삭제 대상 캐릭터: ${deleteRefs.length}명` : `삭제 대상: ${deleteRefs[0].name}`,
              ...(plural ? deleteRefs.map((item) => `- ${item.name}`) : []),
              totalReferenceCount > 0 ? `삭제 대상에 보이스 레퍼런스 ${totalReferenceCount}개가 들어 있습니다.` : "",
              hasVoiceRecord && totalReferenceCount === 0 ? "삭제 대상에 선택된 보이스 기록이 들어 있습니다." : "",
              hasVoiceRecord && plural
                ? voiceRecordMeta
                  .filter((item) => item.hasVoiceRecord)
                  .map((item) => `- ${item.name}: ${item.referenceCount > 0 ? `${item.referenceCount}개` : "선택 보이스 기록"}`)
                  .join("\n")
                : "",
              plural
                ? "보이스 탐색기에서 선택한 캐릭터 항목들을 삭제합니다."
                : "보이스 탐색기에서 이 캐릭터 항목을 삭제합니다.",
              "이미 생성된 wav 파일은 삭제하지 않습니다.",
              hasVoiceRecord ? `계속하려면 아래 문구를 그대로 입력하세요.` : "",
            ].filter(Boolean),
            confirmText: hasVoiceRecord ? DELETE_BOT_CONFIRM_TEXT : "",
          });
          if (!confirmed) return;

          const voiceByCharacter = { ...config.voiceByCharacter };
          const removedNames = [];
          deleteRefs.forEach((item) => {
            delete voiceByCharacter[item.characterId];
            delete voiceReferencesByCharacter[item.characterId];
            removedNames.push(item.name);
          });
          if (deleteRefs.some((item) => activeVoiceCharacterId === item.characterId)) {
            activeVoiceBotId = characterId;
            activeVoiceBotName = characterName;
            activeVoiceCharacterId = characterId;
          }
          await saveConfig({ ...readFormConfig(), voiceByCharacter });
          await saveVoiceReferences();
          refreshVoiceExplorer();
          writeStatus([
            plural ? `${deleteRefs.length}명 캐릭터 항목을 보이스 탐색기에서 삭제했습니다.` : `${removedNames[0]} 항목을 보이스 탐색기에서 삭제했습니다.`,
            plural ? removedNames.map((name) => `- ${name}`).join("\n") : "",
          ].filter(Boolean).join("\n"));
        });
      });

      document.querySelectorAll(".rt-play-explorer-voice").forEach((button) => {
        button.addEventListener("click", async () => {
          const voice = button.dataset.voiceId || "";
          const previewUrl = button.dataset.previewUrl || "";
          const sampleText = button.dataset.sampleText || "";
          try {
            await saveConfig(readFormConfig());
            if (!button.classList.contains("playing")) {
              setPreviewButtonState(button, "loading");
            }
            await playReferencePreview(voice, previewUrl, sampleText, writeStatus, (state) => {
              setPreviewButtonState(button, state);
            });
          } catch (error) {
            setPreviewButtonState(button, "idle");
            writeStatus(`레퍼런스 미리듣기 실패: ${describeError(error)}`);
          }
        });
      });

      document.querySelectorAll(".rt-rename-explorer-voice").forEach((button) => {
        button.addEventListener("click", async () => {
          const voice = button.dataset.voiceId || "";
          const targetCharacterId = button.dataset.characterId || characterId;
          const referenceIndex = Number(button.dataset.referenceIndex ?? -1);
          const refs = selectedReferenceRefs({ characterId: targetCharacterId, referenceIndex, voiceId: voice });
          if (!refs.length) {
            writeStatus("이름을 바꿀 레퍼런스를 찾지 못했습니다.");
            return;
          }

          const input = typeof globalThis.prompt === "function"
            ? globalThis.prompt(
                refs.length > 1
                  ? `${refs.length}개 레퍼런스의 새 보이스 ID 기본 이름을 입력하세요. 확장자는 적지 않아도 됩니다.`
                  : "새 보이스 ID를 입력하세요. 확장자는 적지 않아도 됩니다.",
                refs.length > 1 ? "" : voice,
              )
            : null;
          if (input == null) return;
          const baseVoice = sanitizeVoiceId(input);
          if (!baseVoice) {
            writeStatus("새 보이스 ID가 비어 있습니다.");
            return;
          }
          if (refs.length === 1 && baseVoice === voice) {
            writeStatus("보이스 ID가 그대로입니다.");
            return;
          }

          const endTask = beginSettingsTask("레퍼런스 이름 변경");
          const previousText = button.textContent;
          button.disabled = true;
          button.textContent = "...";
          try {
            await saveConfig(readFormConfig());
            const voiceByCharacter = { ...config.voiceByCharacter };
            const currentProfileId = currentMetadataProfileId();
            const renameVoiceIds = uniqueReferenceRefs(refs)
              .map((ref) => resolveReferenceRef(ref)?.reference?.voiceId || ref.voiceId || "")
              .map((voiceId) => String(voiceId || "").trim())
              .filter(Boolean);
            const metadata = await requestHelperVoiceMetadata().catch(() => null);
            const crossProfileUsages = voiceUsageInSharedMetadata(metadata, renameVoiceIds)
              .filter((usage) => usage.profileId !== currentProfileId);
            if (crossProfileUsages.length) {
              const examples = crossProfileUsages.slice(0, 12).map((usage) => (
                `- ${usage.voiceId}: ${usage.profileLabel} / ${usage.characterName}`
              ));
              throw new Error([
                "다른 메타데이터 프로필에서 사용 중인 wav가 포함되어 있어 파일명을 바꿀 수 없습니다.",
                ...examples,
                crossProfileUsages.length > examples.length ? `외 ${crossProfileUsages.length - examples.length}건` : "",
                "",
                "먼저 해당 프로필에서 레퍼런스를 제거하거나, 서버 폴더에서 직접 새 파일명으로 복사해 등록하세요.",
              ].filter(Boolean).join("\n"));
            }
            const renamedResults = [];
            for (let refIndex = 0; refIndex < refs.length; refIndex += 1) {
              const ref = refs[refIndex];
              const resolved = resolveReferenceRef(ref);
              if (!resolved) {
                renamedResults.push(`${ref.voiceId || "이름 없는 레퍼런스"}: 찾지 못함`);
                continue;
              }
              const oldVoice = resolved.reference.voiceId || ref.voiceId;
              const nextVoice = refs.length === 1 ? baseVoice : sanitizeVoiceId(`${baseVoice}${refIndex === 0 ? "" : `(${refIndex + 1})`}`);
              if (!nextVoice || nextVoice === oldVoice) {
                renamedResults.push(`${oldVoice}: 변경 없음`);
                continue;
              }

              const renamed = await renameReferenceVoiceFile(oldVoice, nextVoice);
              resolved.references[resolved.index] = {
                ...resolved.reference,
                id: renamed.voiceId,
                label: renamed.label,
                voiceId: renamed.voiceId,
                file: renamed.file || resolved.reference.file,
                previewUrl: renamed.previewUrl || helperAudioUrlForVoice(renamed.voiceId),
              };
              saveReferenceList(ref.characterId, resolved.referenceSet, resolved.references);
              for (const [key, value] of Object.entries(voiceByCharacter)) {
                if (value === oldVoice) {
                  voiceByCharacter[key] = renamed.voiceId;
                }
              }
              clearAudioCacheForVoice(oldVoice);
              clearAudioCacheForVoice(renamed.voiceId);
              renamedResults.push(`${oldVoice} → ${renamed.voiceId}`);
            }
            await saveConfig({ ...readFormConfig(), voiceByCharacter });
            await saveVoiceReferences();
            refreshVoiceExplorer();
            writeStatus([
              refs.length > 1 ? `${refs.length}개 레퍼런스 이름 변경을 처리했습니다.` : "레퍼런스 이름 변경을 처리했습니다.",
              ...renamedResults,
            ].join("\n"));
          } catch (error) {
            writeStatus(`레퍼런스 이름 변경 실패: ${describeError(error)}`);
          } finally {
            button.disabled = false;
            button.textContent = previousText;
            endTask();
          }
        });
      });

      document.querySelectorAll(".rt-use-explorer-voice").forEach((button) => {
        button.addEventListener("click", async () => {
          const voice = button.dataset.voiceId || "";
          const targetCharacterId = button.dataset.characterId || characterId;
          if (!voice) {
            writeStatus("먼저 보이스 레퍼런스를 선택하세요.");
            return;
          }
          const voiceByCharacter = { ...config.voiceByCharacter, [targetCharacterId]: voice };
          await saveConfig({ ...readFormConfig(), voiceByCharacter });
          refreshVoiceExplorer();
          writeStatus(`캐릭터 보이스를 ${voice}로 저장했습니다.`);
        });
      });

      document.querySelectorAll(".rt-lock-explorer-voice").forEach((button) => {
        button.addEventListener("click", async () => {
          const voice = button.dataset.voiceId || "";
          const targetCharacterId = button.dataset.characterId || characterId;
          const referenceIndex = Number(button.dataset.referenceIndex ?? -1);
          const resolved = resolveReferenceRef({ characterId: targetCharacterId, referenceIndex, voiceId: voice });
          if (!resolved) {
            writeStatus("잠금 상태를 바꿀 레퍼런스를 찾지 못했습니다.");
            return;
          }
          const nextLocked = !Boolean(resolved.reference.locked);
          resolved.references[resolved.index] = {
            ...resolved.reference,
            locked: nextLocked,
          };
          saveReferenceList(targetCharacterId, resolved.referenceSet, resolved.references);
          await saveVoiceReferences();
          refreshVoiceExplorer();
          writeStatus(`${voice} 레퍼런스의 삭제 잠금을 ${nextLocked ? "켰습니다" : "해제했습니다"}.`);
        });
      });

      document.querySelectorAll(".rt-delete-explorer-voice").forEach((button) => {
        button.addEventListener("click", async () => {
          const voice = button.dataset.voiceId || "";
          const targetCharacterId = button.dataset.characterId || characterId;
          const referenceIndex = Number(button.dataset.referenceIndex ?? -1);
          const refs = selectedReferenceRefs({ characterId: targetCharacterId, referenceIndex, voiceId: voice });
          if (!refs.length) {
            writeStatus("삭제할 레퍼런스를 찾지 못했습니다.");
            return;
          }
          const resolvedRefs = refs.map((ref) => resolveReferenceRef(ref)).filter(Boolean);
          if (!resolvedRefs.length) {
            writeStatus("삭제할 레퍼런스를 보이스 탐색기에서 찾지 못했습니다.");
            return;
          }
          const lockedReferences = resolvedRefs.filter((item) => Boolean(item.reference.locked));
          if (lockedReferences.length) {
            alertLockedReferences(lockedReferences);
            return;
          }

          const formConfig = readFormConfig();
          const profileIdForDelete = normalizeMetadataProfileId(formConfig.metadataProfileId || config.metadataProfileId);
          const profileLabelForDelete = metadataProfileLabel(profileIdForDelete);
          const removedVoices = [];
          const removedVoiceIds = new Set();
          const removedByCharacter = new Map();
          const selectedVoiceIdsByCharacter = new Map();
          for (const ref of refs) {
            const resolved = resolveReferenceRef(ref);
            if (!resolved || resolved.reference.locked) continue;
            const oldVoice = String(resolved.reference.voiceId || ref.voiceId || "").trim();
            if (!oldVoice) continue;
            const selectedSet = selectedVoiceIdsByCharacter.get(ref.characterId) || new Set();
            selectedSet.add(oldVoice);
            selectedVoiceIdsByCharacter.set(ref.characterId, selectedSet);
            const referenceRemovals = removedByCharacter.get(ref.characterId) || [];
            if (referenceRemovals.some((reference) => String(reference.voiceId || "").trim() === oldVoice)) continue;
            referenceRemovals.push(resolved.reference);
            removedByCharacter.set(ref.characterId, referenceRemovals);
            if (!removedVoiceIds.has(oldVoice)) {
              removedVoiceIds.add(oldVoice);
              removedVoices.push(oldVoice);
            }
          }
          if (!removedVoices.length) {
            writeStatus("삭제할 레퍼런스를 보이스 탐색기에서 찾지 못했습니다.");
            return;
          }

          const confirmed = await requestDangerConfirm({
            title: refs.length > 1 ? "보이스 레퍼런스 일괄 삭제" : "보이스 레퍼런스 삭제",
            lines: [
              refs.length > 1
                ? `삭제 대상 레퍼런스: ${removedVoices.length}개`
                : `삭제 대상 레퍼런스: ${removedVoices[0]}`,
              ...removedVoices.map((voiceId) => `- ${voiceId}`),
              `현재 메타데이터 프로필(${profileLabelForDelete})의 보이스 탐색기 기록을 제거합니다.`,
              "voices 폴더의 wav 파일도 삭제합니다.",
              "다른 프로필이나 다른 캐릭터에서 사용 중인 wav는 삭제할 수 없습니다.",
            ],
          });
          if (!confirmed) return;

          const endTask = beginSettingsTask("레퍼런스 삭제");
          const previousText = button.textContent;
          button.disabled = true;
          button.textContent = "...";
          try {
            await saveConfig(formConfig);
            const voiceByCharacter = { ...config.voiceByCharacter };
            const localUsages = [];
            for (const [refCharacterId, referenceSet] of Object.entries(voiceReferencesByCharacter || {})) {
              const selectedSet = selectedVoiceIdsByCharacter.get(refCharacterId) || new Set();
              const characterName = referenceSet?.characterName || referenceSet?.characterId || refCharacterId || "이름 없는 캐릭터";
              for (const reference of referenceItems(referenceSet)) {
                const voiceId = String(reference?.voiceId || "").trim();
                if (!removedVoiceIds.has(voiceId)) continue;
                if (selectedSet.has(voiceId)) continue;
                localUsages.push({ voiceId, characterName });
              }
            }
            for (const [refCharacterId, selectedVoice] of Object.entries(voiceByCharacter || {})) {
              const voiceId = String(selectedVoice || "").trim();
              if (!removedVoiceIds.has(voiceId)) continue;
              const selectedSet = selectedVoiceIdsByCharacter.get(refCharacterId) || new Set();
              if (selectedSet.has(voiceId)) continue;
              const referenceSet = voiceReferencesByCharacter?.[refCharacterId];
              const characterName = referenceSet?.characterName || referenceSet?.characterId || refCharacterId || "선택 보이스 기록";
              localUsages.push({ voiceId, characterName: `${characterName} / 선택 보이스 기록` });
            }
            if (localUsages.length) {
              const examples = localUsages.slice(0, 12).map((usage) => `- ${usage.voiceId}: ${usage.characterName}`);
              throw new Error([
                "현재 프로필의 다른 캐릭터에서 사용 중인 wav가 포함되어 있어 실제 파일을 삭제할 수 없습니다.",
                ...examples,
                localUsages.length > examples.length ? `외 ${localUsages.length - examples.length}건` : "",
              ].filter(Boolean).join("\n"));
            }

            const metadata = await requestHelperVoiceMetadata();
            const crossProfileUsages = voiceUsageInSharedMetadata(metadata, removedVoices)
              .filter((usage) => usage.profileId !== profileIdForDelete);
            if (crossProfileUsages.length) {
              const examples = crossProfileUsages.slice(0, 12).map((usage) => (
                `- ${usage.voiceId}: ${usage.profileLabel} / ${usage.characterName}`
              ));
              throw new Error([
                "다른 메타데이터 프로필에서 사용 중인 wav가 포함되어 있어 실제 파일을 삭제할 수 없습니다.",
                ...examples,
                crossProfileUsages.length > examples.length ? `외 ${crossProfileUsages.length - examples.length}건` : "",
              ].filter(Boolean).join("\n"));
            }

            let fileDeletedCount = 0;
            let fileAlreadyMissingCount = 0;
            const deleteErrors = [];
            for (const voiceId of removedVoices) {
              try {
                if (await deleteReferenceVoiceFile(voiceId)) {
                  fileDeletedCount += 1;
                } else {
                  fileAlreadyMissingCount += 1;
                }
              } catch (error) {
                deleteErrors.push(`- ${voiceId}: ${describeError(error)}`);
              }
            }
            if (deleteErrors.length) {
              throw new Error([
                "일부 wav 파일 삭제에 실패해 보이스 탐색기 기록을 유지했습니다.",
                ...deleteErrors,
              ].join("\n"));
            }

            for (const [refCharacterId, removals] of removedByCharacter.entries()) {
              const referenceSet = voiceReferencesByCharacter[refCharacterId];
              const removeSet = new Set(removals.map((reference) => String(reference.voiceId || "").trim()));
              const references = referenceItems(referenceSet)
                .filter((reference) => !removeSet.has(String(reference.voiceId || "").trim()));
              saveReferenceList(refCharacterId, referenceSet, references);
              if (removeSet.has(String(voiceByCharacter[refCharacterId] || "").trim())) {
                delete voiceByCharacter[refCharacterId];
              }
            }
            await saveConfig({ ...readFormConfig(), voiceByCharacter });
            await saveVoiceReferences();
            removedVoices.forEach(clearAudioCacheForVoice);
            unregisteredVoiceFilesForExplorer = unregisteredVoiceFilesForExplorer
              .filter((voice) => !removedVoiceIds.has(String(voice?.voiceId || "").trim()));
            addRuntimeLog("보이스 레퍼런스 삭제", {
              count: removedVoices.length,
              deleted: fileDeletedCount,
              alreadyMissing: fileAlreadyMissingCount,
              profile: profileIdForDelete,
              voices: removedVoices,
            });

            refreshVoiceExplorer();
            writeStatus([
              `${removedVoices.length}개 보이스 레퍼런스를 삭제했습니다.`,
              fileDeletedCount ? `voices 폴더 wav 파일 ${fileDeletedCount}개를 삭제했습니다.` : "",
              fileAlreadyMissingCount ? `이미 없던 wav 파일: ${fileAlreadyMissingCount}개` : "",
              `메타데이터 프로필: ${profileLabelForDelete}`,
            ].filter(Boolean).join("\n"));
          } catch (error) {
            writeStatus(`레퍼런스 삭제 실패: ${describeError(error)}`);
          } finally {
            button.disabled = false;
            button.textContent = previousText;
            endTask();
          }
        });
      });

    };

    wireExplorerControls();

    document.getElementById("rt-audit-voice-files")?.addEventListener("click", async () => {
      await runSettingsTask("레퍼런스 파일 확인", async () => {
        try {
          await auditVoiceFilesForExplorer({ silent: false });
        } catch (error) {
          writeStatus(`레퍼런스 파일 확인 실패: ${describeError(error)}\n보이스 레퍼런스 Helper가 켜져 있는지 확인하세요.`);
        }
      });
    });

    document.getElementById("rt-save-server-data")?.addEventListener("click", async () => {
      await runSettingsTask("서버 데이터 저장", async () => {
        try {
          const formConfig = readFormConfig();
          const profileId = normalizeMetadataProfileId(formConfig.metadataProfileId);
          const profileLabel = metadataProfileLabel(profileId);
          config = normalizeConfig({
            ...config,
            ...formConfig,
            metadataProfileId: profileId,
            metadataProfileSyncId: profileId,
          });
          sharedVoiceMetadataWriteEnabled = true;
          sharedVoiceMetadataLoadedProfileId = profileId;
          const store = await getStorage();
          await store.setItem(CONFIG_KEY, config);
          await store.setItem(VOICE_REFERENCES_KEY, sanitizedVoiceReferencesForStorage());
          const saved = await persistSharedVoiceMetadata({ allowEmpty: true, force: true });
          if (!saved) {
            throw new Error("서버 메타데이터 저장 요청이 완료되지 않았습니다. 보이스 레퍼런스 Helper가 켜져 있는지 확인하세요.");
          }
          const audit = await auditVoiceFilesForExplorer({ silent: true });
          addRuntimeLog("서버 데이터 저장", {
            profileId,
            profileLabel,
            characters: Object.keys(voiceReferencesByCharacter || {}).length,
            registered: registeredVoiceIds().size,
            voices: audit.voices.length,
            missing: audit.missing.length,
            unregistered: audit.unregistered.length,
          });
          writeStatus([
            "서버 데이터 저장 완료.",
            `메타데이터 프로필: ${profileLabel}`,
            `캐릭터 ${Object.keys(voiceReferencesByCharacter || {}).length}명 / 등록 레퍼런스 ${registeredVoiceIds().size}개`,
            "현재 화면의 보이스 탐색기 구성을 서버 메타데이터에 저장했습니다.",
            "다음 실행에서도 같은 프로필은 저장 대상으로 기억됩니다.",
          ].join("\n"));
        } catch (error) {
          sharedVoiceMetadataWriteEnabled = false;
          sharedVoiceMetadataLoadedProfileId = "";
          config = normalizeConfig({ ...config, metadataProfileSyncId: "" });
          await getStorage()
            .then((store) => store.setItem(CONFIG_KEY, config))
            .catch(() => {});
          writeStatus([
            `서버 데이터 저장 실패: ${describeError(error)}`,
            "",
            "보이스 레퍼런스 Helper가 켜져 있는지 확인하세요.",
            `엔드포인트: ${helperVoiceMetadataUrl() || "(비어 있음)"}`,
          ].join("\n"));
        }
      });
    });

    document.getElementById("rt-import-server-data")?.addEventListener("click", async () => {
      await runSettingsTask("서버 데이터 불러오기", async () => {
        try {
          config = normalizeConfig({ ...config, ...readFormConfig() });
          const store = await getStorage();
          const metadata = await requestHelperVoiceMetadata();
          const metadataLoaded = Boolean(metadata);
          const profileId = currentMetadataProfileId();
          const profileLabel = metadataProfileLabel(profileId);
          const profileFound = metadataLoaded ? Boolean(sharedProfileFromMetadata(metadata, profileId)) : false;
          config = normalizeConfig({ ...config, metadataProfileSyncId: profileId });
          if (metadataLoaded) {
            replaceVoiceExplorerWithSharedMetadata(metadata);
            await store.setItem(CONFIG_KEY, config);
            await store.setItem(VOICE_REFERENCES_KEY, sanitizedVoiceReferencesForStorage());
          } else {
            await store.setItem(CONFIG_KEY, config);
          }
          sharedVoiceMetadataWriteEnabled = true;
          sharedVoiceMetadataLoadedProfileId = profileId;
          const audit = await auditVoiceFilesForExplorer({ silent: true });
          const importedCharacters = Object.keys(voiceReferencesByCharacter || {}).length;
          const importedReferences = registeredVoiceIds().size;
          addRuntimeLog("서버 데이터 불러오기", {
            metadata: metadataLoaded ? "loaded" : "not-found",
            profileId,
            profileLabel,
            profileFound,
            characters: importedCharacters,
            registered: importedReferences,
            voices: audit.voices.length,
            missing: audit.missing.length,
            unregistered: audit.unregistered.length,
          });
          writeStatus([
            "서버 데이터 불러오기 완료.",
            `메타데이터 프로필: ${profileLabel}`,
            metadataLoaded
              ? profileFound
                ? `메타데이터: 캐릭터 ${importedCharacters}명 / 등록 레퍼런스 ${importedReferences}개`
                : "선택한 프로필에 저장된 탐색기 구성이 없어 빈 프로필로 시작합니다."
              : "서버 메타데이터 파일이 없어 voices 폴더 wav만 확인했습니다.",
            `voices 폴더 wav: ${audit.voices.length}개`,
            `파일이 없는 등록 레퍼런스: ${audit.missing.length}개`,
            `미등록 wav: ${audit.unregistered.length}개`,
            metadataLoaded
              ? "보이스 탐색기를 서버 메타데이터 기준으로 갱신했습니다."
              : "미등록 레퍼런스 칸에서 들어본 뒤 원하는 캐릭터 줄로 옮길 수 있습니다.",
            "이제 이 설정 화면에서 만든 변경 사항은 서버 메타데이터에 저장됩니다.",
          ].join("\n"));
        } catch (error) {
          writeStatus([
            `서버 데이터 불러오기 실패: ${describeError(error)}`,
            "",
            "보이스 레퍼런스 Helper가 켜져 있는지 확인하세요.",
            `엔드포인트: ${helperVoiceMetadataUrl() || "(비어 있음)"}`,
          ].join("\n"));
        }
      });
    });

    document.getElementById("metadataProfileId")?.addEventListener("change", async () => {
      const profileId = normalizeMetadataProfileId(document.getElementById("metadataProfileId")?.value || config.metadataProfileId);
      sharedVoiceMetadataWriteEnabled = false;
      sharedVoiceMetadataLoadedProfileId = "";
      await saveConfig({ ...readFormConfig(), metadataProfileId: profileId, metadataProfileSyncId: "" });
      writeStatus([
        `메타데이터 프로필을 ${metadataProfileLabelWithParticle(profileId)} 바꿨습니다.`,
        "현재 화면을 이 프로필로 서버에 올리려면 데이터 저장하기를 누르세요.",
        "서버의 기존 프로필 데이터를 화면으로 가져오려면 데이터 불러오기를 누르세요.",
        "저장이나 불러오기를 하기 전까지는 서버 메타데이터 자동 저장을 잠시 멈춥니다.",
      ].join("\n"));
    });

    setTimeout(() => {
      auditVoiceFilesForExplorer({ silent: true }).catch(() => {});
    }, 500);

    document.getElementById("rt-open-log").addEventListener("click", () => {
      addRuntimeLog("로그 창 열기", `현재 로그 수: ${runtimeLogs.length}`);
      openLogModal();
    });

    const saveSettingsFromForm = async (message = "") => {
      await saveConfig(readFormConfig());
      if (message) writeStatus(message);
    };

    const openPromptPresetModal = async (kind) => {
      await saveSettingsFromForm("");
      const meta = promptPresetMeta(kind);
      let presets = normalizePromptPresets(config[meta.key]);
      const overlay = document.createElement("div");
      overlay.className = "rt-modal-backdrop";
      overlay.tabIndex = -1;
      overlay.innerHTML = `
        <section class="rt-modal prompt-preset-modal" role="dialog" aria-modal="true" aria-label="${htmlEscape(meta.title)}">
          <div class="rt-modal-head">
            <h3>${htmlEscape(meta.title)}</h3>
            <button class="rt-button secondary rt-modal-close" type="button">닫기</button>
          </div>
          <div class="rt-modal-body">
            <p class="rt-muted">현재 텍스트 칸의 내용을 프리셋으로 저장하거나, 저장된 프리셋을 적용합니다.</p>
            <div class="rt-preset-add-row">
              <label class="rt-label">
                <span>새 프리셋 이름</span>
                <input class="rt-preset-name-input" type="text" maxlength="${MAX_PROMPT_PRESET_NAME_CHARS}" placeholder="예: 기본 번역, 속삭임 강조 디렉터">
              </label>
              <button class="rt-button rt-preset-add" type="button">${htmlEscape(meta.addLabel)}</button>
            </div>
            <div class="rt-preset-status"></div>
            <div class="rt-preset-list"></div>
          </div>
          <div class="rt-modal-actions">
            <button class="rt-button secondary rt-modal-close-primary" type="button">닫기</button>
          </div>
        </section>
      `;
      document.body.appendChild(overlay);

      const textarea = document.getElementById(meta.textareaId);
      const list = overlay.querySelector(".rt-preset-list");
      const statusNode = overlay.querySelector(".rt-preset-status");
      const nameInput = overlay.querySelector(".rt-preset-name-input");

      const setPresetStatus = (message) => {
        if (statusNode) statusNode.textContent = String(message || "");
      };

      const persistPresets = async (nextPresets) => {
        presets = normalizePromptPresets(nextPresets);
        await saveConfig({ [meta.key]: presets });
      };

      const renderPresets = () => {
        if (!list) return;
        if (!presets.length) {
          list.innerHTML = `<p class="rt-muted">${htmlEscape(meta.emptyText)}</p>`;
          return;
        }
        list.innerHTML = presets.map((preset) => `
          <div class="rt-preset-row" data-preset-id="${htmlEscape(preset.id)}">
            <div>
              <strong>${htmlEscape(preset.name)}</strong>
              <small>${htmlEscape(promptPresetSnippet(preset.prompt))}</small>
            </div>
            <div class="rt-preset-row-actions">
              <button class="rt-button rt-preset-apply" type="button">적용</button>
              <button class="rt-button danger rt-preset-delete" type="button">삭제</button>
            </div>
          </div>
        `).join("");
        list.querySelectorAll(".rt-preset-apply").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.closest(".rt-preset-row")?.dataset.presetId || "";
            const preset = presets.find((item) => item.id === id);
            if (!preset || !textarea) return;
            textarea.value = preset.prompt;
            await saveConfig({ ...readFormConfig(), [meta.key]: presets });
            writeStatus(`${preset.name} 프리셋을 적용했습니다.`);
            addRuntimeLog("프롬프트 프리셋 적용", { type: kind, name: preset.name });
            overlay.remove();
          });
        });
        list.querySelectorAll(".rt-preset-delete").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.closest(".rt-preset-row")?.dataset.presetId || "";
            const preset = presets.find((item) => item.id === id);
            if (!preset) return;
            await persistPresets(presets.filter((item) => item.id !== id));
            setPresetStatus(`${preset.name} 프리셋을 삭제했습니다.`);
            addRuntimeLog("프롬프트 프리셋 삭제", { type: kind, name: preset.name });
            renderPresets();
          });
        });
      };

      overlay.querySelector(".rt-preset-add")?.addEventListener("click", async () => {
        const prompt = String(textarea?.value || "").trim();
        if (!prompt) {
          setPresetStatus("현재 프롬프트 칸이 비어 있어 추가하지 않았습니다.");
          return;
        }
        if (presets.length >= MAX_PROMPT_PRESETS) {
          setPresetStatus(`프리셋은 최대 ${MAX_PROMPT_PRESETS}개까지 저장할 수 있습니다.`);
          return;
        }
        const name = String(nameInput?.value || "").trim() || `프리셋 ${presets.length + 1}`;
        const preset = {
          id: makePromptPresetId(),
          name,
          prompt,
          createdAt: new Date().toLocaleString("ko-KR"),
        };
        await persistPresets([...presets, preset]);
        if (nameInput) nameInput.value = "";
        setPresetStatus(`${preset.name} 프리셋을 추가했습니다.`);
        addRuntimeLog("프롬프트 프리셋 추가", { type: kind, name: preset.name });
        renderPresets();
      });

      const cleanup = () => overlay.remove();
      overlay.querySelector(".rt-modal-close")?.addEventListener("click", cleanup);
      overlay.querySelector(".rt-modal-close-primary")?.addEventListener("click", cleanup);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) cleanup();
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") cleanup();
      });
      renderPresets();
      setTimeout(() => nameInput?.focus(), 0);
    };

    document.getElementById("rt-translation-prompt-presets")?.addEventListener("click", () => {
      openPromptPresetModal("translation").catch((error) => {
        writeStatus(`번역 프리셋 창 열기 실패: ${describeError(error)}`);
      });
    });

    document.getElementById("rt-emotion-director-prompt-presets")?.addEventListener("click", () => {
      openPromptPresetModal("emotionDirector").catch((error) => {
        writeStatus(`감정 디렉터 프리셋 창 열기 실패: ${describeError(error)}`);
      });
    });

    document.getElementById("rt-close").addEventListener("click", async () => {
      if (settingsTaskIsBusy()) {
        const proceed = await requestSimpleConfirm({
          title: "작업이 아직 진행 중입니다",
          lines: [
            `${activeSettingsTaskLabel || "작업"}이 아직 끝나지 않았습니다.`,
            "설정창을 닫아도 작업이 계속되거나, 완료 직전에 닫으면 일부 결과가 반영되지 않을 수 있습니다.",
            "그래도 닫으시겠습니까?",
          ],
          confirmLabel: "닫기",
          danger: true,
        });
        if (!proceed) return;
      }
      try {
        await saveSettingsFromForm("설정을 저장하고 닫습니다.");
      } catch (error) {
        writeStatus(`설정 저장 실패: ${describeError(error)}`);
        return;
      }
      await api.hideContainer();
    });

    // 오버레이 설정 저장
    document.getElementById("rt-ovl-save")?.addEventListener("click", async () => {
      try {
        overlayConfig.fab.right = Math.max(0, Number(document.getElementById("ovl-fab-right")?.value) || 24);
        overlayConfig.fab.bottom = Math.max(0, Number(document.getElementById("ovl-fab-bottom")?.value) || 24);
        overlayConfig.panel.right = Math.max(0, Number(document.getElementById("ovl-panel-right")?.value) || 24);
        overlayConfig.panel.top = Math.max(0, Number(document.getElementById("ovl-panel-top")?.value) || 64);
        overlayConfig.panel.width = Math.max(200, Number(document.getElementById("ovl-panel-width")?.value) || 320);
        // 배속 목록 파싱 (쉼표 구분 텍스트 → 숫자 배열)
        const speedsRaw = String(document.getElementById("ovl-speeds")?.value || "");
        const parsedSpeeds = speedsRaw.split(",").map((s) => parseFloat(s.trim())).filter((s) => Number.isFinite(s) && s >= 0.25 && s <= 16);
        if (parsedSpeeds.length) {
          overlayConfig.speeds = parsedSpeeds;
          if (!parsedSpeeds.includes(overlayConfig.speed)) overlayConfig.speed = parsedSpeeds[0];
        }
        overlayConfig.volume = Math.min(100, Math.max(0, Number(document.getElementById("ovl-volume")?.value) || 100));
        overlayConfig.cacheMode = (document.getElementById("ovl-cachemode")?.value === "auto") ? "auto"
        : (document.getElementById("ovl-cachemode")?.value === "dblclick") ? "dblclick" : "off";
        overlayConfig.scrollDelay = Math.min(2000, Math.max(0, Number(document.getElementById("ovl-scroll-delay")?.value) || 250));
        overlayConfig.buttonSize = Math.min(40, Math.max(14, Number(document.getElementById("ovl-button-size")?.value) || 22));
        overlayConfig.buttonActivate = (document.getElementById("ovl-button-activate")?.value === "hover") ? "hover" : "click";
        overlayConfig.autoScrollToPlaying = Boolean(document.getElementById("ovl-auto-scroll-playing")?.checked);
        overlayConfig.doubleClickScrollToMessage = Boolean(document.getElementById("ovl-dblclick-scroll-msg")?.checked);
        overlayConfig.skipTextFilter = String(document.getElementById("ovl-skip-text")?.value || "").trim();
        overlayConfig.overlaySelectionSync = Boolean(document.getElementById("ovl-selection-sync")?.checked);
        await saveOverlayConfig();
        writeStatus("오버레이 설정 저장됨");
        if (overlayConfig.cacheMode === "auto") startBackgroundCache();
      } catch (e) {
        writeStatus("오버레이 설정 저장 실패: " + describeError(e));
      }
    });

    // 오버레이 설정 기본값
    document.getElementById("rt-ovl-default")?.addEventListener("click", () => {
      overlayConfig.fab = { right: 24, bottom: 24 };
      overlayConfig.panel = { right: 24, top: 64, width: 320 };
      overlayConfig.speed = 1.0;
      overlayConfig.volume = 100;
      overlayConfig.cacheMode = "off";
      overlayConfig.speeds = [1, 1.25, 1.5, 1.75, 2, 2.5];
      overlayConfig.scrollDelay = 250;
      overlayConfig.buttonSize = 22;
      overlayConfig.buttonActivate = "click";
      overlayConfig.autoScrollToPlaying = true;
      overlayConfig.doubleClickScrollToMessage = true;
      overlayConfig.speed = 1;
      overlayConfig.skipTextFilter = "";
      overlayConfig.overlaySelectionSync = true;
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      setVal("ovl-fab-right", 24); setVal("ovl-fab-bottom", 24);
      setVal("ovl-panel-right", 24); setVal("ovl-panel-top", 64); setVal("ovl-panel-width", 320);
      setVal("ovl-speeds", "1, 1.25, 1.5, 1.75, 2, 2.5"); setVal("ovl-volume", 100);
      setVal("ovl-scroll-delay", 250); setVal("ovl-skip-text", "");
      setVal("ovl-button-size", 22);
      const ba = document.getElementById("ovl-button-activate"); if (ba) ba.value = "click";
      const asp = document.getElementById("ovl-auto-scroll-playing"); if (asp) asp.checked = true;
      const dcs = document.getElementById("ovl-dblclick-scroll-msg"); if (dcs) dcs.checked = true;
      const oss = document.getElementById("ovl-selection-sync"); if (oss) oss.checked = true;
      const cacheSel = document.getElementById("ovl-cachemode"); if (cacheSel) cacheSel.value = "off";
      writeStatus("기본값으로 복원됨. 저장 버튼을 눌러 적용하세요.");
    });

    // 볼륨 슬라이더 실시간 값 표시
    document.getElementById("ovl-volume")?.addEventListener("input", (e) => {
      const lbl = e.target.closest("label");
      if (lbl) lbl.firstChild.textContent = "볼륨 (" + e.target.value + "%) ";
    });

    document.getElementById("rt-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveSettingsFromForm("저장했습니다.");
    });

    [
      "voiceDesignCharacterLine",
      "voiceDesignEmotionEmoji",
      "rt-voice-sample-chars",
      "rt-voice-count",
      "globalNarrationEnabled",
      "readAllButtonEnabled",
      "autoStopOnContextChange",
      "emotionDirectorEnabled",
      "emotionDirectorPrompt",
      "emotionDirectorEndpoint",
      "emotionDirectorApiKey",
      "emotionDirectorModel",
      "emotionDirectorManualCaption",
      "debugTtsSeed",
      "emotionDirectorContextBefore",
      "emotionDirectorContextAfter",
      "emotionDirectorContinueOnError",
      "emotionDirectorCacheEnabled",
      "emotionDirectorApplyMode",
      "lorebookScanPrompt",
    ].forEach((id) => {
      const input = document.getElementById(id);
      input?.addEventListener("change", async () => {
        try {
          await saveSettingsFromForm("");
          if (id === "globalNarrationEnabled") refreshVoiceExplorer();
        } catch (error) {
          console.log(`[RisuTTS] Failed to save voice design option: ${describeError(error)}`);
        }
      });
    });

    document.getElementById("rt-clear-audio-cache")?.addEventListener("click", async () => {
      await runSettingsTask("임시 TTS 캐시 비우기", async () => {
        await saveConfig(readFormConfig());
        stopCurrentAudio();
        const count = clearAllAudioCache();
        addRuntimeLog("임시 TTS 캐시 비움", { count });
        writeStatus(count ? `임시 TTS 캐시 ${count}개를 비웠습니다.` : "비울 임시 TTS 캐시가 없습니다.");
      });
    });

    document.getElementById("rt-health").addEventListener("click", async () => {
      try {
        await saveConfig(readFormConfig());
        const healthUrl = `${normalizeServerUrl(config.serverUrl)}/health`;
        const { response, text } = await requestHealth(healthUrl);
        const lines = [`HTTP ${response.status}`, text, ""];
        if (!response.ok) {
          if (isLikelyWebRisuLanAccessBlock(`HTTP ${response.status}: ${text}`, config.serverUrl)) {
            lines.push(...webRisuLanAccessBlockLines());
          } else {
            lines.push(
              "TTS 서버 /health가 정상 HTTP 200으로 응답하지 않았습니다.",
              "start-risutts.cmd 창의 TTS 서버 로그와 입력한 TTS 서버 URL을 확인하세요."
            );
          }
          writeStatus(lines.join("\n"));
          return;
        }
        try {
          const serverVoices = await requestTtsServerVoiceList();
          const defaultVoice = String(config.defaultVoice || "").trim();
          const voiceIds = new Set(serverVoices.map((voice) => voice.voiceId));
          lines.push(
            config.ttsApiKey
              ? "TTS 서버 API Key: 통과 (/v1/audio/voices 조회 성공)"
              : "TTS 서버 API Key: 미입력 (/v1/audio/voices 조회 성공)",
            `서버 등록 음성: ${serverVoices.length}개`
          );
          if (!defaultVoice || defaultVoice.toLowerCase() === "none") {
            lines.push("대체 보이스 ID: none (확인 생략, 캐릭터/글로벌 보이스 매칭 실패 시에만 쓰는 최후 대체값)");
          } else if (voiceIds.has(defaultVoice)) {
            lines.push(`대체 보이스 ID: ${defaultVoice} (서버에 있음)`);
          } else {
            lines.push(`대체 보이스 ID: ${defaultVoice} (서버 등록 음성 목록에서 찾지 못함)`);
          }
        } catch (voiceError) {
          if (isLikelyWebRisuLanAccessBlock(voiceError, config.serverUrl)) {
            lines.push(
              "TTS 서버 /health는 응답했지만 /v1/audio/voices 조회가 웹 요청 경로에서 막혔습니다.",
              `voices 확인 오류: ${describeError(voiceError)}`,
              ...webRisuLanAccessBlockLines()
            );
          } else {
            lines.push(
              config.ttsApiKey
                ? "TTS 서버 API Key: 확인 실패 (/v1/audio/voices 조회 실패)"
                : "TTS 서버 API Key: 미입력 상태에서 voices 조회 실패",
              `voices 확인 오류: ${describeError(voiceError)}`,
              config.ttsApiKey
                ? "입력한 API Key가 서버 .env의 값과 맞지 않을 수 있습니다."
                : "서버가 API Key를 요구한다면 TTS 서버 API Key를 입력해야 합니다.",
              "대체 보이스 ID: voices 목록 확인 실패로 검증하지 못했습니다."
            );
          }
        }
        writeStatus(lines.join("\n"));
      } catch (error) {
        const lines = [
          `TTS 서버 확인 실패: ${describeError(error)}`,
          "",
          "확인 대상: " + `${normalizeServerUrl(config.serverUrl)}/health`,
        ];
        if (isLikelyWebRisuLanAccessBlock(error, config.serverUrl)) {
          lines.push("", ...webRisuLanAccessBlockLines());
          writeStatus(lines.join("\n"));
          return;
        }
        const helperUrl = helperHealthUrl();
        if (helperUrl) {
          try {
            const helper = await requestHealth(helperUrl);
            lines.push(
              "",
              `보이스 레퍼런스 Helper는 응답합니다. HTTP ${helper.response.status}`,
              "즉, 8090 helper는 켜져 있지만 8088 TTS 서버에 접근하지 못하고 있습니다.",
              "서버가 꺼져 있거나, 웹/PocketRisu 환경에서 8088 TTS 서버의 CORS 설정이 적용되지 않은 상태일 수 있습니다.",
              "start-risutts.cmd 창을 닫았다가 다시 켜고, [TTS] Applied RisuTTS server app.py와 [TTS] Uvicorn running 로그가 나오는지 확인하세요.",
              "배포판 기본 설정은 PC 로컬 사용 기준입니다. PC에서 사용할 때는 TTS 서버 URL을 http://127.0.0.1:8088 로 두세요.",
              "PowerShell 확인 명령: Invoke-RestMethod http://127.0.0.1:8088/health"
            );
          } catch (helperError) {
            lines.push(
              "",
              `보이스 레퍼런스 Helper 확인도 실패했습니다: ${describeError(helperError)}`,
              "start-risutts.cmd를 다시 실행해 TTS 서버와 helper를 함께 켜세요."
            );
          }
        }
        writeStatus(lines.join("\n"));
      }
    });

    document.getElementById("rt-scan-lorebook-characters").addEventListener("click", async () => {
      await runSettingsTask("로어북 캐릭터 스캔", async () => {
      const output = document.getElementById("rt-voice-design-output");
      try {
        await saveConfig(readFormConfig());
        const character = await api.getCharacter().catch(() => null);
        if (!isRealRisuCharacter(character)) {
          output.textContent = "현재 열린 봇이 없습니다. RisuAI 메인 화면이 아니라 RP 봇 채팅 화면에서 로어북 캐릭터 스캔을 실행하세요.";
          return;
        }
        output.textContent = "로어북에서 추가 캐릭터를 찾는 중...";
        const discovered = await discoverLorebookCharactersForCurrentBot(character);
        let added = 0;
        let updated = 0;
        const removedBlocked = pruneBlockedLorebookCharacters(character);
        const currentName = normalizeLoreCandidateName(character?.name || getCharacterId(character)).toLowerCase();
        const acceptedCharacters = [];
        for (const item of discovered.characters) {
          const itemName = normalizeLoreCandidateName(item.name);
          if (!itemName || isBadLoreCandidateName(itemName, currentName)) continue;
          item.name = itemName;
          acceptedCharacters.push(item);
          const key = findExistingLorebookReferenceKey(character, item) || makeLorebookCharacterId(character, item.name);
          const existing = voiceReferencesByCharacter[key] || null;
          voiceReferencesByCharacter[key] = makeLorebookReferenceSet(character, item, existing);
          if (existing) updated += 1;
          else added += 1;
        }
        if (acceptedCharacters.length) {
          await saveConfig({ ...readFormConfig(), ...withoutHiddenBot(getCharacterId(character)) });
        }
        await saveVoiceReferences();
        refreshVoiceExplorer();
        output.textContent = [
          "로어북 캐릭터 스캔 완료.",
          `스캔 모델: ${discovered.modelSource === "main" ? "메인 모델" : "보조 모델"}`,
          `로어북/캐릭터 정보 조각: ${discovered.context.lorebookEntries.length}`,
          `이름 정리: ${lorebookCleanupStatusLabel(discovered.cleanup?.status)}`,
          `새로 추가: ${added}`,
          `기존 갱신: ${updated}`,
          `프로필 항목 제거: ${removedBlocked}`,
        ].join("\n");
        addRuntimeLog("로어북 캐릭터 스캔", {
          bot: character?.name || getCharacterId(character),
          modelSource: discovered.modelSource,
          lorebookEntries: discovered.context.lorebookEntries.length,
          added,
          updated,
          removedBlocked,
          acceptedCharacters: acceptedCharacters.map((item) => ({
            name: item.name,
            aliases: item.aliases || [],
          })),
        });
      } catch (error) {
        addRuntimeLog("로어북 캐릭터 스캔 실패", describeError(error));
        output.textContent = `로어북 캐릭터 스캔 실패: ${describeError(error)}`;
      }
      });
    });

    document.getElementById("rt-add-lorebook-character").addEventListener("click", async () => {
      const output = document.getElementById("rt-voice-design-output");
      try {
        await saveConfig(readFormConfig());
        const parentCharacter = await activeParentCharacter();
        const input = typeof globalThis.prompt === "function"
          ? globalThis.prompt("추가할 캐릭터 이름을 입력하세요.", "")
          : null;
        if (input == null) return;

        const name = normalizeLoreCandidateName(input);
        const parentName = normalizeLoreCandidateName(parentCharacter?.name || activeVoiceBotName || activeVoiceBotId).toLowerCase();
        if (!name || isBadLoreCandidateName(name, parentName)) {
          writeStatus("캐릭터 이름으로 쓰기 어려운 값입니다.");
          if (output) output.textContent = "보이스 탐색기에 표시할 캐릭터 이름을 입력하세요.";
          return;
        }

        const discovered = {
          name,
          aliases: defaultMatchKeysForCharacter(name, []),
          description: "사용자가 직접 추가한 보이스 대상입니다.",
          voiceHints: "",
        };
        const key = findExistingLorebookReferenceKey(parentCharacter, discovered) || makeLorebookCharacterId(parentCharacter, name);
        const existing = voiceReferencesByCharacter[key] || null;
        voiceReferencesByCharacter[key] = makeLorebookReferenceSet(parentCharacter, discovered, existing);
        activeVoiceCharacterId = key;
        await saveConfig({ ...readFormConfig(), ...withoutHiddenBot(getCharacterId(parentCharacter)) });
        await saveVoiceReferences();
        refreshVoiceExplorer();
        writeStatus(`${name} 항목을 보이스 탐색기에 추가했습니다.`);
        if (output) {
          output.textContent = `${name} 항목을 보이스 탐색기에 추가했습니다.\n해당 항목을 선택한 상태에서 보이스 디자인 캡션 생성을 눌러 보이스 디자인 캡션과 레퍼런스 생성용 대사를 채우세요.`;
        }
      } catch (error) {
        if (output) output.textContent = `캐릭터 추가 실패: ${describeError(error)}`;
      }
    });

    document.getElementById("rt-reset-caption-inputs").addEventListener("click", async () => {
      const output = document.getElementById("rt-voice-design-output");
      document.getElementById("rt-voice-guidance").value = "";
      document.getElementById("rt-voice-research-urls").value = "";
      document.getElementById("rt-voice-research-notes").value = "";
      await saveConfig(readFormConfig());
      addRuntimeLog("캡션 자료 초기화", "생성 방향과 캐릭터 조사 자료를 비웠습니다.");
      if (output) output.textContent = "생성 방향과 캐릭터 조사 자료를 비웠습니다.";
    });

    document.getElementById("rt-reset-voice-design-inputs").addEventListener("click", () => {
      const output = document.getElementById("rt-voice-design-output");
      document.getElementById("rt-voice-caption").value = "";
      document.getElementById("rt-voice-sample-text").value = "";
      addRuntimeLog("보이스 디자인 입력 초기화", "보이스 디자인 캡션과 레퍼런스 생성용 대사를 비웠습니다.");
      if (output) output.textContent = "보이스 디자인 캡션과 레퍼런스 생성용 대사를 비웠습니다.";
    });

    document.getElementById("rt-generate-voice").addEventListener("click", async () => {
      await runSettingsTask("보이스 레퍼런스 생성", async () => {
      const output = document.getElementById("rt-voice-design-output");
      try {
        await saveConfig(readFormConfig());
        const { key: targetKey, character: targetCharacter } = await resolveActiveVoiceCharacter();
        const rawCaption = document.getElementById("rt-voice-caption").value.trim();
        const caption = cleanCaption(rawCaption);
        if (caption && caption !== rawCaption) {
          document.getElementById("rt-voice-caption").value = caption;
        }
        const rawCount = Number(document.getElementById("rt-voice-count").value || DEFAULT_CONFIG.voiceReferenceCount);
        const count = normalizeVoiceReferenceCount(rawCount);
        document.getElementById("rt-voice-count").value = String(count);
        const sampleText = cleanVoiceDesignSampleText(document.getElementById("rt-voice-sample-text").value) || PREVIEW_TEXT;
        document.getElementById("rt-voice-sample-text").value = sampleText;
        if (!caption) {
          output.textContent = "먼저 보이스 디자인 캡션을 입력하거나 보이스 디자인 캡션 생성 버튼으로 만들어 주세요.";
          return;
        }
        output.textContent = [
          rawCount !== count ? `레퍼런스 생성 수는 최대 ${MAX_VOICE_REFERENCES_PER_REQUEST}개라 ${rawCount}개 요청을 ${count}개로 낮췄습니다.` : "",
          `${targetCharacter?.name || "캐릭터"}에게 입력한 보이스 디자인 캡션으로 레퍼런스 ${count}개 생성 요청 중...`,
        ].filter(Boolean).join("\n");
        const result = await requestVoiceReferences(targetCharacter, caption, count, sampleText);
        const referenceSet = mergeVoiceReferenceSet(
          voiceReferencesByCharacter[targetKey] || null,
          normalizeGeneratedVoiceReferences(result, targetCharacter, caption, sampleText),
        );
        voiceReferencesByCharacter[targetKey] = referenceSet;
        await saveVoiceReferences();
        refreshVoiceExplorer();
        output.textContent = referenceStatusText("레퍼런스 생성 완료", referenceSet);
        addRuntimeLog("보이스 레퍼런스 저장", {
          character: referenceSet.characterName,
          caption: referenceSet.caption,
          sampleText: referenceSet.sampleText,
          references: referenceItems(referenceSet).map((reference) => ({
            voiceId: reference.voiceId,
            label: reference.label,
            file: reference.file,
          })),
        });
      } catch (error) {
        addRuntimeLog("보이스 레퍼런스 생성 실패", describeError(error));
        output.textContent = voiceDesignFailureText("레퍼런스 생성 실패", error);
      }
      });
    });

document.getElementById("rt-generate-selected-voice").addEventListener("click", async () => {
       await runSettingsTask("보이스 디자인 캡션 생성", async () => {
      const output = document.getElementById("rt-voice-design-output");
      try {
        await saveConfig(readFormConfig());
        const { key: targetKey, character: targetCharacter } = await resolveActiveVoiceCharacter();
        await generateCaptionForCharacter(targetCharacter, targetKey, output);
      } catch (error) {
        addRuntimeLog("보이스 디자인 캡션 생성 실패", describeError(error));
        output.textContent = `보이스 디자인 캡션 생성 실패: ${describeError(error)}`;
      }
      });
    });

    document.getElementById("rt-batch-select-all").addEventListener("click", () => {
      batchSelectAll(true);
      writeStatus("모든 로어북 캐릭터를 선택했습니다.");
    });

    document.getElementById("rt-batch-deselect-all").addEventListener("click", () => {
      batchSelectAll(false);
      writeStatus("모든 캐릭터 선택을 해제했습니다.");
    });

    document.getElementById("rt-batch-captions").addEventListener("click", async () => {
      batchOperationAborted = false;
      await batchGenerateCaptions();
    });

    document.getElementById("rt-batch-references").addEventListener("click", async () => {
      batchOperationAborted = false;
      await batchGenerateReferences();
    });

    document.getElementById("rt-batch-auto-select").addEventListener("click", async () => {
      await batchAutoSelectUnused();
    });

    const batchProgressEl = document.getElementById("rt-batch-progress");
    if (batchProgressEl) {
      batchProgressEl.addEventListener("click", () => {
        if (settingsTaskIsBusy()) {
          batchOperationAborted = true;
          writeStatus("일괄 작업 중단 요청: 현재 진행 중인 캐릭터까지만 처리하고 종료합니다.");
        }
      });
    }

  }

  function readFormConfig() {
    return {
      serverUrl: document.getElementById("serverUrl").value,
      ttsModel: document.getElementById("ttsModel").value,
      metadataProfileId: document.getElementById("metadataProfileId")?.value || config.metadataProfileId,
      defaultVoice: document.getElementById("defaultVoice").value,
      ttsApiKey: document.getElementById("ttsApiKey").value,
      responseFormat: document.getElementById("responseFormat").value,
      numSteps: Number(document.getElementById("numSteps").value),
      speed: Number(document.getElementById("speed").value),
      cfgScaleText: Number(document.getElementById("cfgScaleText").value),
      cfgScaleSpeaker: Number(document.getElementById("cfgScaleSpeaker").value),
      cfgScaleCaption: Number(document.getElementById("cfgScaleCaption").value),
      chunkMinChars: Number(document.getElementById("chunkMinChars").value),
      longMessageSpeakerButtonLimit: Number(document.getElementById("longMessageSpeakerButtonLimit")?.value),
      batchCaptionConcurrency: Number(document.getElementById("rt-batch-concurrency")?.value),
      readAllPrefetchAhead: Number(document.getElementById("readAllPrefetchAhead")?.value),
      ttsCacheMode: (document.getElementById("ttsCacheMode")?.value === TTS_CACHE_MODE_REGENERATE) ? TTS_CACHE_MODE_REGENERATE : TTS_CACHE_MODE_REUSE,
      cudaCacheCleanupMode: (() => {
        const v = document.getElementById("cudaCacheCleanupMode")?.value;
        if (v === CUDA_CACHE_CLEANUP_MODE_THRESHOLD) return CUDA_CACHE_CLEANUP_MODE_THRESHOLD;
        if (v === CUDA_CACHE_CLEANUP_MODE_ALWAYS) return CUDA_CACHE_CLEANUP_MODE_ALWAYS;
        return CUDA_CACHE_CLEANUP_MODE_OFF;
      })(),
      autoStopOnContextChange: document.getElementById("autoStopOnContextChange").checked,
      referenceVolumeNormalize: Boolean(document.getElementById("referenceVolumeNormalize")?.checked),
      readAllButtonEnabled: document.getElementById("readAllButtonEnabled")?.checked !== false,
      koreanTranslateTts: document.getElementById("koreanTranslateTts").checked,
      translationPrompt: document.getElementById("translationPrompt").value,
      translationModel: document.getElementById("translationModel").value,
      translationEndpoint: document.getElementById("translationEndpoint").value,
      translationApiKey: document.getElementById("translationApiKey").value,
      translationMethod: document.querySelector('input[name="translationMethod"]:checked')?.value || "llm",
      emotionDirectorEnabled: document.getElementById("emotionDirectorEnabled").checked,
      emotionDirectorPrompt: document.getElementById("emotionDirectorPrompt").value,
      emotionDirectorEndpoint: document.getElementById("emotionDirectorEndpoint").value,
      emotionDirectorApiKey: document.getElementById("emotionDirectorApiKey").value,
      emotionDirectorModel: document.getElementById("emotionDirectorModel").value,
      emotionDirectorManualCaption: document.getElementById("emotionDirectorManualCaption").value,
      debugTtsSeed: document.getElementById("debugTtsSeed").value,
      emotionDirectorContextBefore: Number(document.getElementById("emotionDirectorContextBefore").value),
      emotionDirectorContextAfter: Number(document.getElementById("emotionDirectorContextAfter").value),
      emotionDirectorContinueOnError: document.getElementById("emotionDirectorContinueOnError").checked,
      emotionDirectorCacheEnabled: document.getElementById("emotionDirectorCacheEnabled")?.checked !== false,
      emotionDirectorApplyMode: document.getElementById("emotionDirectorApplyMode").value,
      captionModelSource: document.querySelector('input[name="captionModelSource"]:checked')?.value || "aux",
      lorebookScanPrompt: document.getElementById("lorebookScanPrompt").value,
      captionModel: document.getElementById("captionModel").value,
      captionEndpoint: document.getElementById("captionEndpoint").value,
      captionApiKey: document.getElementById("captionApiKey").value,
      ttsModelEndpoint: document.getElementById("ttsModelEndpoint").value,
      voiceDesignCharacterLine: document.getElementById("voiceDesignCharacterLine").checked,
      voiceDesignEmotionEmoji: document.getElementById("voiceDesignEmotionEmoji").checked,
      voiceReferenceCount: normalizeVoiceReferenceCount(document.getElementById("rt-voice-count").value),
      voiceReferenceSampleChars: normalizeVoiceReferenceSampleChars(document.getElementById("rt-voice-sample-chars")?.value),
      voiceDesignGuidance: document.getElementById("rt-voice-guidance")?.value || "",
      voiceDesignResearchUrls: document.getElementById("rt-voice-research-urls")?.value || "",
      voiceDesignResearchNotes: document.getElementById("rt-voice-research-notes")?.value || "",
      globalNarrationEnabled: document.getElementById("globalNarrationEnabled").checked,
      voiceByCharacter: config.voiceByCharacter,
      hiddenBotIds: config.hiddenBotIds || [],
      hiddenBotNames: config.hiddenBotNames || {},
    };
  }

  installRuntimeSingleton();
  await loadConfig();
  addRuntimeLog("플러그인 초기화", {
    version: PLUGIN_VERSION,
    serverUrl: config.serverUrl,
    ttsModel: config.ttsModel,
    ttsModelEndpoint: config.ttsModelEndpoint,
  });
  await api.registerSetting(PLUGIN_DISPLAY_NAME, renderSettings, RISUTTS_MENU_ICON, "html", SETTINGS_ID);

  // ============================ 오버레이 시스템 ============================
  // 기존 DOM 인라인 버튼 주입 + MutationObserver 재스캔 방식을 완전히 대체.
  // 메시지 DOM에 손대지 않고 position:fixed 오버레이 층에 버튼을 깐다.
  // 수동 버튼 누르기 전엔 어떤 코드도 채팅에 개입하지 않는다.
  // 라이트보드 인레이 이미지 플러그인 패턴 기반.

  let overlayRoot = null;
  let overlayFab = null;
  let overlayMainPanel = null;
  let overlayTopInfoRow = null;
  let overlayTopButtonRow = null;
  let overlayGenBtn = null;
  let overlayAudioPermissionGranted = false;
  let overlayReadAllBtn = null;
  let overlayClearBtn = null;
  let overlaySpeedPopup = null;
  let overlaySpeedItems = [];
  let overlayHeaderLeft = null;
  let overlayListHeader = null;
  let overlayListItems = null;
  let overlayLayer = null;
  let overlayToast = null;
  let overlayToastTimer = null;
  let overlayChatScrollBtn = null;
  let overlayOpen = false;
  let overlayCollapsed = false;
  let overlayCollapseBtn = null;
  let overlayScrollTimer = null;
  let overlayScrolling = false;
  let overlaySelectedIdx = -1;
  let overlaySelectedText = "";
  let overlaySelectedHash = "";
  let overlaySegments = [];
  let overlayStreamTimer = null;
  const OVERLAY_STREAM_POLL_MS = 15000;
  let overlayCacheTickTimer = null;
  const OVERLAY_CACHE_TICK_MS = 5000;
  let overlayButtons = [];
  let overlayHoverBox = null;
  let overlayPlayingBox = null;
  let currentPlayingPayloadId = "";
  let overlayHoverLastTs = 0;
  let overlayHoverCurrentPayloadId = "";
  let overlayHoverPlayedPayloadId = "";
  let overlayLastListItemClickTs = 0;
  let overlayLastListItemClickPayloadId = "";
  let overlayTopRolesApplied = false;
  // --- 채팅 컨테이너/메시지 DOM 캐시 (클릭 버스트 내 중복 스캔 방지) ---
  let cachedChatContainer = null;
  let cachedChatContainerTs = 0;
  const CACHED_CHAT_CONTAINER_TTL_MS = 5000;
  let cachedMessageElements = null;
  let cachedMessageElementsTs = 0;
  let cachedMessageElementsContainer = null;
  const CACHED_MESSAGE_ELEMENTS_TTL_MS = 1000;
  // --- api.getChatFromIndex 결과 캐시 (selectMessageAtPoint 중복 API 호출 방지) ---
  let cachedChatMessages = null;
  let cachedChatMessagesTs = 0;
  let cachedChatMessagesCharIdx = -1;
  let cachedChatMessagesChatIdx = -1;
  const CACHED_CHAT_MESSAGES_TTL_MS = 300;

  function invalidateChatDomCaches() {
    cachedChatContainer = null;
    cachedChatContainerTs = 0;
    cachedMessageElements = null;
    cachedMessageElementsTs = 0;
    cachedMessageElementsContainer = null;
    cachedChatMessages = null;
    cachedChatMessagesTs = 0;
    cachedChatMessagesCharIdx = -1;
    cachedChatMessagesChatIdx = -1;
  }

  async function getCachedChatMessages() {
    const now = Date.now();
    try {
      const ci = await api.getCurrentCharacterIndex();
      const chi = await api.getCurrentChatIndex();
      if (
        cachedChatMessages &&
        cachedChatMessagesCharIdx === ci &&
        cachedChatMessagesChatIdx === chi &&
        (now - cachedChatMessagesTs) < CACHED_CHAT_MESSAGES_TTL_MS
      ) {
        return cachedChatMessages;
      }
      const chat = await api.getChatFromIndex(ci, chi);
      if (chat && Array.isArray(chat.message)) {
        cachedChatMessages = chat.message;
        cachedChatMessagesTs = now;
        cachedChatMessagesCharIdx = ci;
        cachedChatMessagesChatIdx = chi;
        return cachedChatMessages;
      }
    } catch (e) {}
    return null;
  }

  async function safeGetScrollTop(el) {
    if (!el) return 0;
    try {
      if (typeof el.getProperty === "function") {
        const v = await el.getProperty("scrollTop");
        if (v != null) return Number(v) || 0;
      }
    } catch (e) {}
    try {
      if (typeof el.scrollTop === "number") return el.scrollTop;
      const v = await el.scrollTop;
      if (v != null) return Number(v) || 0;
    } catch (e) {}
    return 0;
  }

  async function safeSetScrollTop(el, value) {
    if (!el) return false;
    const v = Math.max(0, Number(value) || 0);
    try {
      if (typeof el.scrollTo === "function") {
        await el.scrollTo(0, v);
        return true;
      }
    } catch (e) {}
    try {
      if (typeof el.setProperty === "function") {
        await el.setProperty("scrollTop", v);
        return true;
      }
    } catch (e) {}
    try {
      el.scrollTop = v;
      return true;
    } catch (e) {}
    return false;
  }
  let overlayListItemEls = [];
  const overlayPlayedPayloadIds = new Set();
  let overlayLogPanel = null;
  let overlayLogContent = null;
  let overlayLogBtn = null;
  let overlayLogOpen = false;
  const overlayLogLines = [];
  let overlayPlayFromBtn = null;
  let overlayDialogueOnlyBtn = null;
  let overlayDialogueOnly = false;
  let overlayBgCacheRunning = false;
  let overlayBgCachePaused = false;
  let overlayBgCacheEpoch = 0; // 백그라운드 캐시 요청 epoch: 증가 시 기존 루프가 양보하고 최신 요청만 진행
  let startBackgroundCacheTimer = null; // startBackgroundCache debounce(300ms): 자가 증식 + 외부 빈번 트리거 억제
  let overlayCycleRunning = false;
  let overlayCycleCancelled = false;
  let overlayCycleIdx = 0;
  let overlayCycleCompleted = false;
  let overlayPrevBtn = null;
  let overlayNextBtn = null;
  let overlayJumpRequest = -1;
  let overlayLastClickTime = 0;
  let overlayLastClickIdx = -1;
  let overlaySpeedBtn = null;
  const DEFAULT_OVERLAY_SPEEDS = [1, 1.25, 1.5, 1.75, 2, 2.5];
  function getOverlaySpeeds() {
    if (Array.isArray(overlayConfig.speeds) && overlayConfig.speeds.length) return overlayConfig.speeds;
    return DEFAULT_OVERLAY_SPEEDS;
  }

  // 영구 저장 설정 (pluginStorage)
  const OVERLAY_CONFIG_KEY = "risutts_overlay_config_v1";
  let overlayConfig = {
    fab: { right: 24, bottom: 24 },
    panel: { right: 24, top: 64, width: 320 },
    speed: 1.0,
    volume: 100,
    bgCache: false,
    cacheMode: "off",
    speeds: [1, 1.25, 1.5, 1.75, 2, 2.5],
    scrollDelay: 250,
    buttonSize: 22,
    buttonActivate: "click",
    autoScrollToPlaying: true,
    doubleClickScrollToMessage: true,
    skipTextFilter: "",
    overlaySelectionSync: true,
    chatAutoScroll: true,
  };

  async function loadOverlayConfig() {
    try {
      const raw = await api.pluginStorage.getItem(OVERLAY_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (parsed.fab) overlayConfig.fab = Object.assign(overlayConfig.fab, parsed.fab);
          if (parsed.panel) overlayConfig.panel = Object.assign(overlayConfig.panel, parsed.panel);
          if (Number.isFinite(parsed.speed)) overlayConfig.speed = parsed.speed;
          if (Number.isFinite(parsed.volume)) overlayConfig.volume = parsed.volume;
          if (typeof parsed.bgCache === "boolean") overlayConfig.cacheMode = parsed.bgCache ? "auto" : "off";
          if (typeof parsed.cacheMode === "string") overlayConfig.cacheMode = parsed.cacheMode;
          if (Array.isArray(parsed.speeds) && parsed.speeds.length) {
            overlayConfig.speeds = parsed.speeds.filter((s) => Number.isFinite(s) && s >= 0.25 && s <= 16).map((s) => Number(s));
          }
          if (Number.isFinite(parsed.scrollDelay)) overlayConfig.scrollDelay = Math.min(2000, Math.max(0, parsed.scrollDelay));
          if (Number.isFinite(parsed.buttonSize)) overlayConfig.buttonSize = Math.min(40, Math.max(14, parsed.buttonSize));
          if (typeof parsed.buttonActivate === "string") overlayConfig.buttonActivate = (parsed.buttonActivate === "hover") ? "hover" : "click";
          if (typeof parsed.autoScrollToPlaying === "boolean") overlayConfig.autoScrollToPlaying = parsed.autoScrollToPlaying;
          if (typeof parsed.doubleClickScrollToMessage === "boolean") overlayConfig.doubleClickScrollToMessage = parsed.doubleClickScrollToMessage;
          if (typeof parsed.skipTextFilter === "string") overlayConfig.skipTextFilter = parsed.skipTextFilter;
          if (typeof parsed.overlaySelectionSync === "boolean") overlayConfig.overlaySelectionSync = parsed.overlaySelectionSync;
          if (typeof parsed.chatAutoScroll === "boolean") overlayConfig.chatAutoScroll = parsed.chatAutoScroll;
        }
      }
    } catch (e) {}
  }

  async function saveOverlayConfig() {
    try { await api.pluginStorage.setItem(OVERLAY_CONFIG_KEY, JSON.stringify(overlayConfig)); } catch (e) {}
  }

  const OVERLAY_ROOT_CLS = "risutts-overlay-root";
  const OVERLAY_CHAT_SCOPES = ['[class*="chat-container"]', '[class*="message-list"]', 'main', '.scroller'];
  const OVERLAY_MSG_SELECTORS = ["[class*='message-content']", "[class*='MessageContent']", "[class*='chat-message']", "[class*='ChatMessage']"];
  const TOP_BTN_ROLES = ["gen", "readall", "playfrom", "prev", "next", "speed", "dialogueonly", "clear", "scroll", "log", "collapse"];

  function fabStyle() {
    const f = overlayConfig.fab;
    return "position:fixed;z-index:99995;right:" + f.right + "px;bottom:" + f.bottom + "px;width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 6px 20px rgba(37,99,235,0.5);user-select:none;font-family:sans-serif;line-height:1;pointer-events:auto;";
  }

  function mainPanelStyle(display) {
    const p = overlayConfig.panel;
    return "position:fixed;z-index:99992;right:" + p.right + "px;top:" + p.top + "px;width:" + p.width + "px;max-height:560px;flex-direction:column;background:#16161a;border:1px solid #2e2e38;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,0.5);font-family:sans-serif;color:#e3e3e6;pointer-events:auto;overflow:hidden;display:" + (display || "none") + ";";
  }

  function logPanelStyle(display) {
    return "position:fixed;z-index:99993;left:24px;bottom:24px;width:420px;max-height:260px;flex-direction:column;background:#16161a;border:1px solid #2e2e38;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.5);font-family:monospace;color:#9ae6b4;pointer-events:auto;overflow:hidden;display:" + (display || "none") + ";";
  }

  async function ovlMk(tag, opts) {
    const el = await rootDoc.createElement(tag);
    if (opts && opts.className) await el.setClassName(opts.className);
    if (opts && opts.style) await el.setStyleAttribute(opts.style);
    if (opts && opts.html != null) await el.setInnerHTML(opts.html);
    if (opts && opts.text != null) await el.setTextContent(opts.text);
    return el;
  }

  // 스피너 CSS를 위한 스타일 요소
  let overlaySpinnerStyle = null;

  // --- 대사 세그먼트 추출 (decorateContent 파싱 로직 재사용, HTML 주입 없음) ---
  function parseContentSegments(content) {
    const rawContent = String(content || "");
    const withoutCssErrors = stripRisuCssErrors(rawContent);
    const cleanedContent = stripRisuTtsControls(withoutCssErrors);
    if (!cleanedContent.trim()) return null;
    const skipRule = describeDecorateSkipRule(cleanedContent);
    if (skipRule) return null;
    if (looksLikeRisuNonChatUi(cleanedContent)) return null;
    if (!looksLikeRpSpeakableContent(cleanedContent)) return null;

    const contentHash = hashText(cleanedContent);
    const cacheKey = contentHash + "|" + (config.globalNarrationEnabled ? "1" : "0") + "|" + (config.koreanTranslateTts ? "1" : "0");
    const cached = parsedSegmentsCache.get(cacheKey);
    if (cached) {
      for (const seg of cached.segments) {
        if (!payloads.has(seg.payloadId)) {
          payloads.set(seg.payloadId, {
            id: seg.payloadId,
            mode: seg.mode,
            sourceText: seg.text,
            contentHash: cached.contentHash,
            segmentIndex: seg.index,
            speakerName: seg.speakerName || "",
            speakerCueGender: seg.speakerCueGender || "",
            segmentKind: seg.segmentKind || "line",
            createdAt: Date.now(),
          });
        }
      }
      return { contentHash: cached.contentHash, segments: cached.segments, payloadList: cached.payloadList };
    }
    return parseContentSegmentsUncached(content, cleanedContent, contentHash);
  }
  function parseContentSegmentsUncached(content, cleanedContent, contentHash) {
    const contentSegments = [];
    const payloadList = [];
    let index = 0;
    const quotePattern = new RegExp("([「“\"])([^」”\"]{1," + QUOTED_SEGMENT_MAX_CHARS + "})([」”\"])", "g");

    const collectSegment = (sourceText, segmentKind, speakerName, extraOptions) => {
      if (isRisuTtsForbiddenLine(sourceText)) return;
      const cleanText = segmentKind === "narration"
        ? cleanNarrationSourceText(sourceText)
        : cleanSegmentSourceText(sourceText);
      const cleanMode = getSegmentMode(cleanText);
      if (!cleanText || !cleanMode) return;
      const options = {
        speakerName: speakerName || "",
        segmentKind: segmentKind || "line",
        speakerCueGender: (extraOptions && extraOptions.speakerCueGender) || "",
      };
      const payloadId = createPayload(cleanText, cleanMode, contentHash, index, options);
      contentSegments.push({
        index: index,
        payloadId: payloadId,
        mode: cleanMode,
        text: cleanText,
        speakerName: options.speakerName,
        speakerCueGender: options.speakerCueGender,
        segmentKind: options.segmentKind,
      });
      const p = payloads.get(payloadId);
      if (p) payloadList.push(Object.assign({}, p));
      index += 1;
    };

    const collectQuotedText = (text, segmentKind, speakerName, qOpts) =>
      String(text || "").replace(quotePattern, (match, open, body, close, offset, source) => {
        if (isRisuTtsForbiddenLine(source)) return match;
        if (qOpts && qOpts.dialogueOnly && !looksLikeDialogueQuoteInContext(source, offset, body)) return match;
        const sourceText = stripInlineHtml(body);
        const mode = getSegmentMode(sourceText);
        if (!mode) return match;
        collectSegment(sourceText, segmentKind, speakerName, qOpts);
        return match;
      });

    const isNonSpeakableNarrationLine = (line) => {
      const rawLine = String(line || "");
      if (isRisuTtsForbiddenLine(rawLine)) return true;
      if (/<\s*h[1-6]\b/i.test(rawLine)) return true;
      const text = cleanSegmentSourceText(rawLine);
      if (!text) return true;
      if (looksLikeLooseSpeakerQuoteLine(text)) return true;
      if (hasColonlessShortInlineQuote(text)) return true;
      if (/(?:x-risu-risutts-|data-risu-risutts-|x-risutts-|data-risutts-|risutts-action|risutts-read-all)/i.test(rawLine)) return true;
      if (/^#{1,6}\s+\S/.test(text)) return true;
      if (/^(?:応答|response|assistant\s*response)$/i.test(text)) return true;
      if (/^(?:巻|章)\s*\d+\s*[:：]/i.test(text)) return true;
      if (/^(?:chat\s*index|chatindex)\s*[:：]/i.test(text)) return true;
      if (/[∮∯]/.test(text) && /(?:chat\s*index|chatindex|^\s*#{1,6})/i.test(text)) return true;
      return false;
    };

    const shouldCollectNarrationLine = (line) => {
      if (!config.globalNarrationEnabled) return false;
      if (isRisuTtsForbiddenLine(line)) return false;
      if (/<(button|input|textarea|select|script|style|svg|canvas|audio|video)\b/i.test(line)) return false;
      const text = stripInlineHtml(line);
      if (looksLikeLooseSpeakerQuoteLine(line)) return false;
      if (isNonSpeakableNarrationLine(line)) return false;
      if (!text || text.length < 2 || text.length > NARRATION_LINE_MAX_CHARS) return false;
      if (/^[#>*\-\s]+$/.test(text)) return false;
      return Boolean(getSegmentMode(text));
    };

    const lines = cleanedContent.split("\n");
    let inRisuThoughtBlock = false;
    for (const line of lines) {
      const thoughtBoundary = risuThoughtBlockBoundary(line);
      if (inRisuThoughtBlock || thoughtBoundary.starts) {
        inRisuThoughtBlock = !thoughtBoundary.ends;
        continue;
      }
      if (isRisuTtsForbiddenLine(line)) continue;
      const speakerLine = parseSpeakerLine(line);
      if (speakerLine) {
        const speakerOptions = { speakerCueGender: speakerLine.speakerCueGender || "" };
        const beforeCount = contentSegments.length;
        // HTML 태그 제거 후 인용부호 매칭 (mark 태그 속성값의 " 가 잘못 매칭되는 것 방지)
        const restForQuotes = speakerLine.rest.replace(/<[^>]+>/g, "");
        collectQuotedText(restForQuotes, "dialogue", speakerLine.speakerName, speakerOptions);
        if (contentSegments.length === beforeCount) {
          const spoken = cleanSegmentSourceText(stripSpeakerCueWrappingQuotes(speakerLine.rest));
          const mode = getSegmentMode(spoken);
          if (mode) collectSegment(spoken, "dialogue", speakerLine.speakerName, speakerOptions);
        }
        continue;
      }
      const beforeCount2 = contentSegments.length;
      // HTML 태그 제거 후 인용부호 매칭
      const lineForQuotes = line.replace(/<[^>]+>/g, "");
      collectQuotedText(lineForQuotes, "quote", "", { dialogueOnly: true, speakerCueGender: "" });
      if (contentSegments.length > beforeCount2) continue;
      if (shouldCollectNarrationLine(line)) {
        const narration = cleanNarrationSourceText(line);
        const mode = getSegmentMode(narration);
        if (mode) collectSegment(narration, "narration", "");
      }
    }

    if (!contentSegments.length) return null;
    rememberContentSegments(contentHash, contentSegments);
    rememberReadAllPayloadList(contentHash, payloadList);
    const cacheKey = contentHash + "|" + (config.globalNarrationEnabled ? "1" : "0") + "|" + (config.koreanTranslateTts ? "1" : "0");
    if (parsedSegmentsCache.size >= PARSED_SEGMENTS_CACHE_MAX) {
      const firstKey = parsedSegmentsCache.keys().next().value;
      if (firstKey) parsedSegmentsCache.delete(firstKey);
    }
    parsedSegmentsCache.set(cacheKey, {
      contentHash,
      segments: contentSegments.map((s) => ({ ...s })),
      payloadList: payloadList.map((p) => ({ ...p })),
    });
    return { segments: contentSegments, contentHash: contentHash, payloadList: payloadList };
  }

  // --- 채팅 컨테이너 찾기 ---
  async function findChatContainer() {
    if (!rootDoc) return null;
    const now = Date.now();
    if (cachedChatContainer && (now - cachedChatContainerTs) < CACHED_CHAT_CONTAINER_TTL_MS) {
      return cachedChatContainer;
    }
    for (const sel of OVERLAY_CHAT_SCOPES) {
      try {
        const el = await rootDoc.querySelector(sel);
        if (el) {
          const r = await el.getBoundingClientRect();
          if (r && r.height > 200) {
            cachedChatContainer = el;
            cachedChatContainerTs = now;
            return el;
          }
        }
      } catch (e) {}
    }
    cachedChatContainer = null;
    cachedChatContainerTs = 0;
    return null;
  }

  // --- 메시지 요소 수집 ---
  async function getMessageElements(container) {
    if (!container) {
      container = await findChatContainer();
      if (!container) return [];
    }
    const now = Date.now();
    if (
      cachedMessageElements &&
      cachedMessageElementsContainer === container &&
      (now - cachedMessageElementsTs) < CACHED_MESSAGE_ELEMENTS_TTL_MS
    ) {
      return cachedMessageElements;
    }
    for (const sel of OVERLAY_MSG_SELECTORS) {
      try {
        const els = await api.unwarpSafeArray(await container.querySelectorAll(sel));
        if (els.length) {
          cachedMessageElements = els;
          cachedMessageElementsTs = now;
          cachedMessageElementsContainer = container;
          return els;
        }
      } catch (e) {}
    }
    return [];
  }

  // --- 메시지 선택 (클릭한 지점이 어떤 메시지 안에 있는지 탐색) ---
  // 빠른 경로: elementFromPoint로 클릭한 메시지를 O(1)에 찾기. 실패 시 rect 루프 폴백.
  async function findHitMessageFast(x, y, msgs) {
    try {
      if (!rootDoc || typeof rootDoc.elementFromPoint !== "function") return -1;
      let target = await rootDoc.elementFromPoint(x, y);
      for (let depth = 0; target && depth < 12; depth += 1) {
        let pid = "";
        try { pid = await target.getAttribute("data-ovl-payload-id").catch(() => ""); } catch (e) {}
        if (pid) return -1; // 오버레이 버튼 클릭 — 메시지 선택 아님
        for (let j = 0; j < msgs.length; j += 1) {
          if (msgs[j] === target) return j;
        }
        try { target = typeof target.getParent === "function" ? await target.getParent() : null; } catch (e) { target = null; }
      }
    } catch (e) {}
    return -1;
  }

  async function applyMessageHit(i, msgs, chatMessages) {
    let domText = "";
    try { domText = await msgs[i].getInnerHTML(); } catch (e) {}
    const domPlain = stripInlineHtml(domText || "").trim();
    const domKey = domPlain.replace(/\s+/g, "").slice(0, 30);
    let matchedIdx = -1;
    let text = "";
    // 1차: 텍스트 키워드 매칭
    if (chatMessages && domKey) {
      for (let j = 0; j < chatMessages.length; j++) {
        const m = chatMessages[j];
        const mText = (typeof m === "string") ? m : (m && m.data) || "";
        const mKey = stripInlineHtml(mText || "").replace(/\s+/g, "").slice(0, 30);
        if (mKey && domKey && (mKey.includes(domKey) || domKey.includes(mKey))) {
          matchedIdx = j;
          text = mText;
          break;
        }
      }
    }
    // 2차: 역순 매핑
    if (matchedIdx < 0 && chatMessages) {
      const revIdx = chatMessages.length - 1 - i;
      if (revIdx >= 0 && revIdx < chatMessages.length) {
        matchedIdx = revIdx;
        const m = chatMessages[revIdx];
        text = (typeof m === "string") ? m : (m && m.data) || "";
      }
    }
    // 3차: DOM 순서
    if (matchedIdx < 0) {
      matchedIdx = i;
      if (chatMessages && i < chatMessages.length) {
        const m = chatMessages[i];
        text = (typeof m === "string") ? m : (m && m.data) || "";
      }
    }
    if (!text) text = domText || "";
    // 메시지가 바뀌었거나, 같은 메시지여도 텍스트가 바뀌었거나(스트리밍 중 내용 추가), 항목이 없으면 자동 생성
    const oldIdx = overlaySelectedIdx;
    const oldText = overlaySelectedText;
    const textChanged = (text || "") !== (oldText || "");
    const shouldAutoGen = (matchedIdx !== oldIdx) || (overlaySegments.length === 0) || textChanged;
    if (shouldAutoGen) {
      overlaySelectedIdx = matchedIdx;
      if (matchedIdx !== oldIdx) overlayCycleIdx = 0; // 메시지 변경 시 포커스/캐시 기준점 초기화
      overlaySelectedText = text || "";
      await renderTopPanel().catch(() => {});
      if (matchedIdx !== oldIdx) {
        await setOverlayToast("메시지 #" + (matchedIdx + 1) + " 선택됨", "info");
        setTimeout(() => setOverlayToast("", "info"), 1000);
        addOverlayLog("메시지 변경 #" + (oldIdx + 1) + "→#" + (matchedIdx + 1) + " — 자동 생성");
      } else if (textChanged) {
        addOverlayLog("같은 메시지 #" + (matchedIdx + 1) + "이나 텍스트 변경됨 — 자동 생성");
      } else {
        addOverlayLog("같은 메시지 #" + (matchedIdx + 1) + "이나 항목 없음 — 자동 생성");
      }
      if (overlayGenerationInFlight) {
        addOverlayLog("selectMessageAtPoint: 생성 진행 중 — 새 토큰 발급 후 generateSegments로 슈퍼시드");
        overlayGenerationToken += 1;
        overlayGenerationInFlight = false;
      }
      if (overlaySelectedText) {
        await generateSegments().catch(() => {});
      }
    }
    return true;
  }

  async function selectMessageAtPoint(x, y) {
    if (!overlayOpen || !rootDoc) return false;
    const container = await findChatContainer();
    if (!container) return false;
    const msgs = await getMessageElements(container);
    if (!msgs.length) return false;
    const chatMessages = await getCachedChatMessages();
    // 빠른 경로: elementFromPoint로 클릭한 메시지 직접 찾기
    let hitIdx = await findHitMessageFast(x, y, msgs);
    // 폴백: rect 히트테스트 (elementFromPoint 미지원/SafeElement 래퍼 불일치 시)
    if (hitIdx < 0) {
      for (let i = 0; i < msgs.length; i += 1) {
        let r;
        try { r = await msgs[i].getBoundingClientRect(); } catch (e) { continue; }
        if (!r) continue;
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          hitIdx = i;
          break;
        }
      }
    }
    if (hitIdx < 0) return false;
    return applyMessageHit(hitIdx, msgs, chatMessages);
  }

  // --- 드래그 선택 (pointerup 시) ---
  async function onOverlayPointerUp(e) {
    if (!overlayOpen || !rootDoc) return;
    const x = e.clientX, y = e.clientY;
    if (typeof x !== "number" || typeof y !== "number") return;
    // 더블클릭 감지: 400ms 내 같은 메시지 재클릭
    const now = Date.now();
    const beforeIdx = overlaySelectedIdx;
    await selectMessageAtPoint(x, y).catch(() => {});
    if (overlayConfig.cacheMode === "dblclick" && overlaySelectedIdx === beforeIdx && overlaySelectedIdx === overlayLastClickIdx && (now - overlayLastClickTime) < 400) {
      // 더블클릭 — 해당 메시지 캐시 생성
      addOverlayLog("더블클릭 감지 — 메시지 #" + (overlaySelectedIdx + 1) + " 캐시 생성");
      // 진행 중이면 잠시 대기 (효율적으로 재사용)
      if (overlayGenerationInFlight) {
        addOverlayLog("더블클릭 — 진행 중인 generateSections 대기");
        const waitToken = overlayGenerationToken;
        let waited = 0;
        while (overlayGenerationInFlight && overlayGenerationToken === waitToken && waited < 2000) {
          await sleepMs(50);
          waited += 50;
        }
      }
      await setOverlayToast("캐시 생성중...", "loading");
      if (overlaySelectedText) {
        await generateSegments().catch(() => {});
        // generateSegments 후 백그라운드 캐시 강제 실행
        if (overlaySegments.length > 0) {
          runBackgroundCache(true).catch(() => {});
        }
      }
      await setOverlayToast("", "info");
      overlayLastClickTime = 0; // 더블클릭 소비
    } else {
      overlayLastClickTime = now;
      overlayLastClickIdx = overlaySelectedIdx;
    }
  }

  // --- 오버레이 버튼 색상 결정 ---
  function segmentButtonColor(seg) {
    if (seg.segmentKind === "narration") return "rgba(100,116,139,0.65)"; // 회색
    if (seg.speakerCueGender === "female") return "rgba(236,72,153,0.65)"; // 분홍
    if (seg.speakerCueGender === "male") return "rgba(59,130,246,0.65)";   // 파랑
    return "rgba(59,130,246,0.65)"; // 기본 파랑
  }

  function clearOverlayButtons() {
    if (overlayLayer) { try { overlayLayer.setInnerHTML(""); } catch (e) {} }
    overlayButtons = [];
    if (overlayHoverBox) { try { overlayHoverBox.setStyleAttribute("display:none;"); } catch (e) {} }
    overlayHoverCurrentPayloadId = "";
    if (overlayPlayingBox) { try { overlayPlayingBox.setStyleAttribute("display:none;"); } catch (e) {} }
  }

  // --- 오버레이 스피커 버튼 배치 (텍스트 위 별도 층, 색상 코딩) ---
async function placeOverlayButtons() {
    if (!overlayOpen || overlayScrolling) return;
    if (!overlaySegments.length || !rootDoc) return;
    clearOverlayButtons();
    const container = await findChatContainer();
    if (!container) return;
    const msgs = await getMessageElements(container);
    if (!msgs.length) return;
    const vh = (typeof window !== "undefined" && window.innerHeight) || 800;
    const bs = overlayConfig.buttonSize || 22;
    const halfBs = bs / 2;
    const fontPx = Math.max(8, Math.round(bs * 0.45));
    function normalizeForMatch(text) {
      return String(text || "")
        .replace(/[^a-zA-Z0-9\uac00-\ud7a3\u3040-\u30ff\u3400-\u9fff\uff00-\uffef\u4e00-\u9fff]/g, "")
        .toLowerCase();
    }
    async function makeButtonAndGuide(btnLeft, btnTop, textTop, textBottom, textLeft, textRight, color, payloadId, childEl) {
      const guideHeight = Math.max(textBottom - textTop, bs);
      const guideTop = textTop;
      const guideLeft = btnLeft + halfBs - 1;
      const guideStyle = "position:fixed;z-index:99988;left:" + guideLeft + "px;top:" + guideTop + "px;width:2px;height:" + guideHeight + "px;border-radius:1px;background:" + color + ";opacity:0.35;pointer-events:none;";
      const guide = await ovlMk("div", { style: guideStyle });
      await overlayLayer.appendChild(guide);
      const btnStyle = "position:fixed;z-index:99989;left:" + btnLeft + "px;top:" + btnTop + "px;width:" + bs + "px;height:" + bs + "px;border-radius:50%;background:" + color + ";color:#fff;display:flex;align-items:center;justify-content:center;font-size:" + fontPx + "px;cursor:pointer;pointer-events:auto;box-shadow:0 1px 4px rgba(0,0,0,0.3);user-select:none;line-height:1;border:1px solid rgba(255,255,255,0.2);transition:transform 80ms ease,filter 80ms ease box-shadow 80ms ease;";
      const btn = await ovlMk("div", { style: btnStyle, html: "&#9654;" });
      try { await btn.setAttribute("data-ovl-payload-id", payloadId); } catch (e) {}
      try { await btn.setAttribute("data-ovl-role", "speaker"); } catch (e) {}
      await overlayLayer.appendChild(btn);
      overlayButtons.push({
        el: btn,
        guide: guide,
        payloadId: payloadId,
        color: color,
        childEl: childEl || null,
        textRect: { top: textTop, bottom: textBottom, left: textLeft, right: textRight, height: guideHeight, width: textRight - textLeft },
      });
    }
    const _placeCacheSig = msgs.length + "|" + (overlaySelectedHash || "") + "|" + (overlaySelectedIdx < 0 ? "" : String(overlaySelectedIdx));
    const _placeCacheNow = Date.now();
    if (
      overlayButtonPlaceCache.sig !== _placeCacheSig ||
      (_placeCacheNow - overlayButtonPlaceCache.ts) >= OVERLAY_BUTTON_PLACE_TTL_MS
    ) {
      overlayButtonPlaceCache.map.clear();
      overlayButtonPlaceCache.ts = _placeCacheNow;
      overlayButtonPlaceCache.sig = _placeCacheSig;
    }
    for (let i = 0; i < msgs.length; i += 1) {
      let msgRect;
      try { msgRect = await msgs[i].getBoundingClientRect(); } catch (e) { continue; }
      if (!msgRect || msgRect.bottom < -300 || msgRect.top > vh + 300) continue;
      let childInfos = overlayButtonPlaceCache.map.get(i);
      if (!childInfos) {
        let childEls = [];
        try {
          childEls = await api.unwarpSafeArray(await msgs[i].querySelectorAll("p, div, span, li, td, button"));
        } catch (e) { childEls = []; }
        const textPromises = childEls.map((child) => child.textContent().catch(() => ""));
        const rectPromises = childEls.map((child) => child.getBoundingClientRect().catch(() => null));
        const texts = await Promise.all(textPromises);
        const rects = await Promise.all(rectPromises);
        childInfos = [];
        for (let ci = 0; ci < childEls.length; ci += 1) {
          const childText = String(texts[ci] || "");
          if (!childText) continue;
          const cr = rects[ci];
          if (!cr) continue;
          childInfos.push({ text: childText, rect: cr, key: normalizeForMatch(childText), el: childEls[ci] });
        }
        overlayButtonPlaceCache.map.set(i, childInfos);
      }
      let msgInnerHtml = null;
      const usedTops = [];
      for (const seg of overlaySegments) {
        if (!seg.text || seg.text.length < 2) continue;
        const segKey = normalizeForMatch(seg.text).slice(0, 20);
        if (!segKey || segKey.length < 3) continue;
        let bestCi = null;
        let bestDiff = Infinity;
        for (const ci of childInfos) {
          if (!ci.key || ci.key.length < segKey.length) continue;
          if (ci.key.includes(segKey)) {
            const diff = ci.key.length - segKey.length;
            if (diff < bestDiff) { bestDiff = diff; bestCi = ci; }
          }
        }
        if (bestCi) {
          const isDup = usedTops.some((t) => Math.abs(t - bestCi.rect.top) < 8);
          if (!isDup) {
            const r = bestCi.rect;
            if (r.top > -100 && r.top < vh + 100) {
              usedTops.push(r.top);
              const color = segmentButtonColor(seg);
              const btnLeft = r.right - bs - 4;
              const btnTop = r.top + r.height / 2 - halfBs;
              await makeButtonAndGuide(btnLeft, btnTop, r.top, r.bottom, r.left, r.right, color, seg.payloadId, bestCi.el);
            }
            continue;
          }
        }
        let innerHtml = "";
        if (msgInnerHtml == null) {
          try { msgInnerHtml = await msgs[i].getInnerHTML(); } catch (e) { msgInnerHtml = ""; }
        }
        innerHtml = msgInnerHtml;
        const plainText = stripInlineHtml(innerHtml);
        if (!plainText) continue;
        const lines = plainText.split("\n");
        let lineIdx = -1;
        for (let li = 0; li < lines.length; li++) {
          const lineKey = normalizeForMatch(lines[li]);
          if (lineKey.length >= segKey.length && lineKey.includes(segKey)) { lineIdx = li; break; }
        }
        if (lineIdx < 0) continue;
        const estY = msgRect.top + (lineIdx / Math.max(1, lines.length)) * msgRect.height;
        if (estY < -50 || estY > vh + 50) continue;
        const isDup = usedTops.some((t) => Math.abs(t - estY) < 10);
        if (isDup) continue;
        usedTops.push(estY);
        const color = segmentButtonColor(seg);
        const btnLeft = msgRect.right - bs - 4;
        const btnTop = estY - halfBs;
        const lineH = msgRect.height / Math.max(1, lines.length);
        const textTop = estY - lineH / 2;
        const textBottom = estY + lineH / 2;
        await makeButtonAndGuide(btnLeft, btnTop, textTop, textBottom, msgRect.left, msgRect.right, color, seg.payloadId);
      }
    }
    if (currentPlayingPayloadId) updatePlayingHighlight(currentPlayingPayloadId);
    overlayHoverPlayedPayloadId = "";
    redrawSelectedBox().catch(() => {});
  }

  function rgbaFromColor(color, alpha) {
    const c = String(color || "rgba(59,130,246,0.65)");
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
    const h2 = c.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (h2) return `rgba(${parseInt(h2[1],16)},${parseInt(h2[2],16)},${parseInt(h2[3],16)},${alpha})`;
    return `rgba(59,130,246,${alpha})`;
  }

  async function updatePlayingHighlight(payloadId) {
    currentPlayingPayloadId = String(payloadId || "");
    if (currentPlayingPayloadId) {
      overlayPlayedPayloadIds.add(currentPlayingPayloadId);
      setOverlayToast("", "info").catch(() => {});
    }
    if (typeof updateListPanelLight === "function") {
      updateListPanelLight().catch(() => {});
    }
  }

  async function onOverlayPointerMove(e) {
    if (!overlayOpen || overlayScrolling) return;
    const now = Date.now();
    if (now - overlayHoverLastTs < 60) return;
    overlayHoverLastTs = now;
    const x = e.clientX, y = e.clientY;
    let hoverOb = null;
    for (const ob of overlayButtons) {
      let r;
      try { r = await ob.el.getBoundingClientRect(); } catch (err) { continue; }
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        hoverOb = ob;
        break;
      }
    }
    if (!overlayHoverBox) return;
    if (hoverOb && hoverOb.textRect) {
      overlayHoverCurrentPayloadId = hoverOb.payloadId;
      const tr = hoverOb.textRect;
      const hoverColor = rgbaFromColor(hoverOb.color, 0.12);
      const borderColor = rgbaFromColor(hoverOb.color, 0.35);
      const style = "position:fixed;z-index:99986;display:block;pointer-events:none;border-radius:4px;background:" + hoverColor + ";border:1px solid " + borderColor + ";left:" + (tr.left - 2) + "px;top:" + tr.top + "px;width:" + (tr.right - tr.left + 4) + "px;height:" + tr.height + "px;";
      try { await overlayHoverBox.setStyleAttribute(style); } catch (e) {}
      if (overlayConfig.buttonActivate === "hover" && hoverOb.payloadId && hoverOb.payloadId !== overlayHoverPlayedPayloadId) {
        overlayHoverPlayedPayloadId = hoverOb.payloadId;
        addOverlayLog("오버 재생: " + (hoverOb.payloadId || "").slice(0, 16));
        if (!overlayAudioPermissionGranted) {
          await requestAudioPermission();
        }
        try {
          await setOverlayToast("재생중...", "loading");
          const handled = await jumpToSegment(hoverOb.payloadId);
          if (!handled) {
            // 동기화 꺼짐 → 기존 동작
            await handleButtonClick(null, hoverOb.payloadId, { syncState: false });
          }
        } catch (err) {
          addOverlayLog("오버 재생 실패: " + describeError(err));
          await setOverlayToast("", "info");
        }
      }
    } else if (overlayHoverCurrentPayloadId) {
      overlayHoverCurrentPayloadId = "";
      overlayHoverPlayedPayloadId = "";
      try { await overlayHoverBox.setStyleAttribute("display:none;"); } catch (e) {}
    }
  }

  function onOverlayScroll() {
    if (!overlayOpen) return;
    if (!overlayScrolling) {
      overlayScrolling = true;
      clearOverlayButtons();
      overlayButtonPlaceCache.map.clear();
      overlayButtonPlaceCache.ts = 0;
      overlayButtonPlaceCache.sig = "";
    }
    if (overlayScrollTimer) clearTimeout(overlayScrollTimer);
    overlayScrollTimer = setTimeout(async () => {
      overlayScrollTimer = null;
      overlayScrolling = false;
      await placeOverlayButtons().catch(() => {});
    }, overlayConfig.scrollDelay);
  }

  // --- 토스트 (info / loading / playing 타입 지원) ---
  async function setOverlayToast(text, type) {
    if (!overlayToast) return;
    if (overlayToastTimer) { clearTimeout(overlayToastTimer); overlayToastTimer = null; }
    const t = type || "info";
    let html = "";
    if (t === "loading") {
      html = '<div style="display:flex;align-items:center;gap:8px;">' +
        '<div style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:risutts-spin 0.8s linear infinite;"></div>' +
        '<span>' + String(text || "생성중...") + '</span></div>';
    } else if (t === "playing") {
      html = '<div style="display:flex;align-items:center;gap:6px;">' +
        '<span style="font-size:16px;animation:risutts-pulse 1s ease-in-out infinite;">🔊</span>' +
        '<span>' + String(text || "재생중") + '</span></div>';
    } else {
      html = String(text || "");
    }
    await overlayToast.setInnerHTML(html).catch(() => {});
    await overlayToast.setStyleAttribute(
      "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;" +
      "background:rgba(37,99,235,0.95);color:#fff;padding:8px 16px;border-radius:8px;" +
      "font-family:sans-serif;font-size:13px;display:" + (text ? "block" : "none") +
      ";box-shadow:0 4px 12px rgba(0,0,0,0.4);"
    );
    // 생성중(loading) 토스트는 3초 후 자동 종료 (재생 시작 콜백이 놓칠 경우 대비)
    if (text && t === "loading") {
      overlayToastTimer = setTimeout(() => {
        overlayToastTimer = null;
        setOverlayToast("", "info").catch(() => {});
      }, 3000);
    }
  }

  // --- 로그 ---
  function addOverlayLog(msg) {
    const ts = new Date().toLocaleTimeString();
    const line = "[" + ts + "] " + String(msg || "");
    overlayLogLines.push(line);
    if (overlayLogLines.length > 200) overlayLogLines.shift();
    if (overlayLogContent && overlayLogOpen) {
      overlayLogContent.setTextContent(overlayLogLines.join("\n")).catch(() => {});
    }
    try { console.log("[RisuTTS:OVL] " + line); } catch (e) {}
  }

  // --- 오디오 재생 권한 획득 (1회) ---
  async function requestAudioPermission() {
    if (overlayAudioPermissionGranted) return true;
    addOverlayLog("requestAudioPermission: 권한 다이얼로그 표시");
    try {
      await api.showContainer("fullscreen");
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#e2e8f0;font-family:sans-serif;">
          <div style="text-align:center;max-width:400px;padding:32px;">
            <div style="font-size:48px;margin-bottom:16px;">🔊</div>
            <h2 style="font-size:20px;margin:0 0 12px;">오디오 재생 권한 필요</h2>
            <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 24px;">
              RisuTTS 오버레이에서 대사를 재생하려면<br>
              브라우저 오디오 재생 권한이 필요합니다.<br>
              아래 버튼을 한 번만 클릭해주세요.
            </p>
            <button id="rt-audio-permit-btn" type="button"
              style="background:#2563eb;color:#fff;border:none;padding:14px 32px;border-radius:10px;font-size:16px;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,0.4);">
              재생 허용
            </button>
            <p style="font-size:11px;color:#64748b;margin-top:20px;">
              이 작업은 페이지 새로고침 시 1회만 필요합니다.
            </p>
          </div>
        </div>
      `;
      return await new Promise((resolve) => {
        const btn = document.getElementById("rt-audio-permit-btn");
        if (!btn) { resolve(false); return; }
        btn.addEventListener("click", async () => {
          try {
            const url = makeSilentWavUrl(AUDIO_PRIME_SILENCE_MS);
            const a = new Audio(url);
            a.preload = "auto";
            await a.play().catch(() => {});
            try { a.pause(); a.src = ""; } catch (e) {}
            URL.revokeObjectURL(url);
            overlayAudioPermissionGranted = true;
            addOverlayLog("requestAudioPermission: 권한 획득 성공");
          } catch (e) {
            addOverlayLog("requestAudioPermission: 오류 " + describeError(e));
          }
          try { await api.hideContainer(); } catch (e) {}
          document.body.innerHTML = "";
          resolve(true);
        });
        setTimeout(() => {
          if (!overlayAudioPermissionGranted) {
            try { api.hideContainer().catch(() => {}); } catch (e) {}
            document.body.innerHTML = "";
            resolve(false);
          }
        }, 30000);
      });
    } catch (e) {
      addOverlayLog("requestAudioPermission: 실패 " + describeError(e));
      return false;
    }
  }

  // --- 대사만 토글 ---
  async function toggleDialogueOnly() {
    overlayDialogueOnly = !overlayDialogueOnly;
    if (overlayDialogueOnlyBtn) {
      const dotColor = overlayDialogueOnly ? "#818cf8" : "#64748b";
      await overlayDialogueOnlyBtn.setInnerHTML(
        "<span>대사만</span>" +
        "<span style='width:6px;height:6px;border-radius:50%;background:" + dotColor + ";display:inline-block;'></span>"
      ).catch(() => {});
    }
    addOverlayLog("대사만 읽기 " + (overlayDialogueOnly ? "ON" : "OFF"));
    await renderListPanel().catch(() => {});
    await placeOverlayButtons().catch(() => {});
    // 대사만 토글 후 백그라운드 캐시 재요청: getEffectiveSegments() 결과가 바뀌므로
    // 기존 루프는 양보(epoch++)하고 새 세그먼트 목록으로 다시 스캔.
    startBackgroundCache();
  }

  // --- 배속 옵션 팝업 표시 ---
  async function toggleSpeed() {
    if (!overlaySpeedPopup || !overlaySpeedBtn) return;
    let pRect;
    try { pRect = await overlaySpeedPopup.getBoundingClientRect(); } catch (e) { pRect = null; }
    if (pRect && pRect.width > 0) {
      await overlaySpeedPopup.setStyleAttribute("display:none;");
      return;
    }
    let r;
    try { r = await overlaySpeedBtn.getBoundingClientRect(); } catch (e) { r = null; }
    if (!r || !r.width) return;
    const speeds = getOverlaySpeeds();
    for (const entry of overlaySpeedItems) {
      try { await overlaySpeedPopup.removeChild(entry.el); } catch (e) {}
    }
    overlaySpeedItems = [];
    for (const s of speeds) {
      const isActive = s === overlayConfig.speed;
      const item = await ovlMk("div", {
        style: "cursor:pointer;padding:4px 12px;border-radius:4px;font-size:11px;white-space:nowrap;display:flex;align-items:center;justify-content:space-between;gap:12px;color:" + (isActive ? "#60a5fa" : "#e3e3e6") + ";background:" + (isActive ? "rgba(37,99,235,0.15)" : "transparent") + ";",
      });
      await item.setInnerHTML(s + "x" + (isActive ? "<span style='color:#60a5fa;'>&#10003;</span>" : "")).catch(() => {});
      overlaySpeedItems.push({ el: item, speed: s });
      await overlaySpeedPopup.appendChild(item);
    }
    await overlaySpeedPopup.setStyleAttribute("position:fixed;z-index:99999;display:flex;flex-direction:column;gap:2px;padding:4px;background:#1e1e24;border:1px solid #2e2e38;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.5);min-width:80px;left:" + r.left + "px;top:" + (r.bottom + 4) + "px;");
  }

  // --- 백그라운드 캐시 생성 ---
  function getEffectiveSegments() {
    if (overlayDialogueOnly) return overlaySegments.filter((s) => s.segmentKind !== "narration");
    return overlaySegments;
  }

  async function runBackgroundCache(force) {
    if (overlayBgCacheRunning || !overlayOpen) return;
    if (!force && overlayConfig.cacheMode !== "auto") return;
    if (overlaySegments.length === 0) return;
    if (overlayGenerationInFlight) {
      addOverlayLog("runBackgroundCache 대기: generateSegments 진행 중");
      const waitToken = overlayGenerationToken;
      let waited = 0;
      while (overlayGenerationInFlight && overlayGenerationToken === waitToken && waited < 5000) {
        await sleepMs(50);
        waited += 50;
      }
      if (overlayGenerationInFlight) {
        addOverlayLog("runBackgroundCache 포기: generateSections 5초 대기 초과");
        return;
      }
    }
    overlayBgCacheRunning = true;
    addOverlayLog("백그라운드 캐시 시작" + (force && force !== undefined ? " (수동)" : ""));
    // 시작 시점의 epoch 캡처. 새 요청(incrementalRegenerate 등)이 오면 epoch가 증가하고
    // 현재 진행 중인 항목만 마치고 양보 → 항상 최신 요청의 백그라운드만 진행(겹침 방지).
    const myEpoch = overlayBgCacheEpoch;
    try {
      const segs = getEffectiveSegments();
      // 캐시 순서: 매 항목마다 현재 선택(overlayCycleIdx) 기준으로 다음 미캐시 항목을 동적 탐색.
      // 선택 항목 이후(끝까지) 우선 → 이전 항목은 가까운 순. 미선택 시 anchor=0(상단부터).
      // 루프 도중 사용자가 다른 항목을 선택/재생하면 다음 선택부터 즉시 그쪽으로 우선순위 이동.
      const attempted = new Set();
      const cacheCandidate = (idx) => {
        const cs = segs[idx];
        if (!cs || attempted.has(idx) || overlayPlayedPayloadIds.has(cs.payloadId)) return false;
        if (!payloads.has(cs.payloadId)) { attempted.add(idx); return false; }
        return true;
      };
      for (let guard = 0; guard < segs.length + 2; guard++) {
        if ((!force && overlayConfig.cacheMode !== "auto") || !overlayOpen || overlayBgCachePaused) break;
        // 새 백그라운드 요청 감지(epoch 변경): 진행 중인 항목은 완료하고 양보
        if (myEpoch !== overlayBgCacheEpoch) {
          addOverlayLog("백그라운드 캐시 양보: 새 요청 (epoch " + overlayBgCacheEpoch + ")");
          break;
        }
        const cacheAnchor = (overlaySelectedIdx >= 0 && overlayCycleIdx >= 0 && overlayCycleIdx < segs.length) ? overlayCycleIdx : 0;
        let i = -1;
        for (let k = cacheAnchor; k < segs.length; k++) { if (cacheCandidate(k)) { i = k; break; } }
        if (i < 0) { for (let k = cacheAnchor - 1; k >= 0; k--) { if (cacheCandidate(k)) { i = k; break; } } }
        if (i < 0) break;
        attempted.add(i);
        const seg = segs[i];
        const payload = payloads.get(seg.payloadId);
        addOverlayLog("캐시 " + (i + 1) + "/" + segs.length + " (기준 #" + (cacheAnchor + 1) + "): " + (payload.sourceText || "").slice(0, 20));
        try {
          let textForTts = payload.sourceText;
          if (payload.mode === "ko" || payload.mode === "en") {
            textForTts = await translateToJapanese(payload.sourceText, payload.mode);
          }
          const prepared = await prepareTtsPlaybackEntry(textForTts, payload, {});
          if (prepared && prepared.state === "ready") {
            overlayPlayedPayloadIds.add(seg.payloadId);
            // in-place 갱신: 전체 리렌더 없이 해당 항목의 캐시 아이콘만 ✅로 교체
            const itemEntry = overlayListItemEls.find((e) => e.payloadId === seg.payloadId);
            if (itemEntry && itemEntry.el) {
              itemEntry.cached = true;
              try {
                const kids = await api.unwarpSafeArray(await itemEntry.el.getChildren());
                if (kids[1]) await kids[1].setTextContent("✅").catch(() => {});
              } catch (e) {}
            }
          }
        } catch (e) {
          addOverlayLog("캐시 실패 " + (i + 1) + ": " + describeError(e));
        }
      }
      addOverlayLog("백그라운드 캐시 완료");
    } catch (e) {
      addOverlayLog("백그라운드 캐시 오류: " + describeError(e));
    } finally {
      overlayBgCacheRunning = false;
      overlayBgCachePaused = false;
      // 새 epoch가 대기 중이면(양보한 경우) 최신 상태로 백그라운드 캐시 자동 재시작
      if (overlayOpen && overlayConfig.cacheMode === "auto" && overlaySegments.length > 0
          && myEpoch !== overlayBgCacheEpoch) {
        startBackgroundCache();
      }
    }
  }

  function startBackgroundCache() {
    // debounce(300ms): 300ms 내 연속 호출 합치기 → 자가 증식 차단 + 외부 빈번 트리거 억제
    if (startBackgroundCacheTimer) clearTimeout(startBackgroundCacheTimer);
    startBackgroundCacheTimer = setTimeout(() => {
      startBackgroundCacheTimer = null;
      overlayBgCacheEpoch++; // 새 요청: 기존 루프가 양보하고 이 요청을 진행하도록 보장
      if (overlayConfig.cacheMode === "auto" && overlayOpen && !overlayBgCacheRunning) {
        runBackgroundCache().catch(() => {});
      }
      // 이미 running 중이면 epoch만 증가 → 루프가 다음 iteration에서 양보하고 finally 재시작(역시 debounce)
    }, 300);
  }

  // --- 스트리밍 폴링 (메시지 변경 감지 → 증분 갱신) ---
  function startStreamPolling() {
    if (overlayStreamTimer) return;
    overlayStreamTimer = setInterval(() => {
      if (overlayOpen) checkStreamingMessage().catch(() => {});
    }, OVERLAY_STREAM_POLL_MS);
  }

  function stopStreamPolling() {
    if (overlayStreamTimer) {
      clearInterval(overlayStreamTimer);
      overlayStreamTimer = null;
    }
  }

  // 10초 캐시 틱: (1) 변경된 아이콘만 ❌→✅ 갱신(렉 최소화), (2) 멈춘 백그라운드 캐시 재깨움
  async function refreshCacheIconsLight() {
    if (!overlayListItemEls.length) return;
    for (let i = 0; i < overlayListItemEls.length; i++) {
      const entry = overlayListItemEls[i];
      if (!entry || !entry.el) continue;
      const now = overlayPlayedPayloadIds.has(entry.payloadId);
      if (now === entry.cached) continue; // 변동 없음 → DOM 미접촉
      try {
        const kids = await api.unwarpSafeArray(await entry.el.getChildren());
        if (kids[1]) await kids[1].setTextContent(now ? "✅" : "❌").catch(() => {});
        entry.cached = now;
      } catch (e) {}
    }
  }

  function startCacheTick() {
    if (overlayCacheTickTimer) return;
    overlayCacheTickTimer = setInterval(() => {
      if (!overlayOpen) return;
      refreshCacheIconsLight().catch(() => {});
      if (overlayConfig.cacheMode === "auto" && !overlayBgCacheRunning && overlaySegments.length > 0) {
        startBackgroundCache();
      }
    }, OVERLAY_CACHE_TICK_MS);
  }

  function stopCacheTick() {
    if (overlayCacheTickTimer) {
      clearInterval(overlayCacheTickTimer);
      overlayCacheTickTimer = null;
    }
  }

  // 폴링 콜백: API 1회 호출로 선택 메시지 텍스트 비교. 변경 시에만 증분 갱신.
  async function checkStreamingMessage() {
    if (!overlayOpen || overlaySelectedIdx < 0 || !overlaySelectedText) return;
    if (overlayGenerationInFlight) return;
    let newText = "";
    try {
      const ci = await api.getCurrentCharacterIndex();
      const chi = await api.getCurrentChatIndex();
      const chat = await api.getChatFromIndex(ci, chi);
      const msg = chat && Array.isArray(chat.message) ? chat.message[overlaySelectedIdx] : null;
      newText = (typeof msg === "string") ? msg : ((msg && msg.data) || "");
    } catch (e) { return; }
    if (!newText || newText === overlaySelectedText) return; // 변경 없음 → no-op
    // 인덱스 드리프트 가드: 접두사 불일치 시 다른 메시지 → 폴링 스킵
    const oldKey = String(overlaySelectedText).replace(/\s+/g, "").slice(0, 30);
    const newKey = String(newText).replace(/\s+/g, "").slice(0, 30);
    if (oldKey.length >= 15 && !newKey.startsWith(oldKey.slice(0, 15))) return;
    await incrementalRegenerate(newText);
  }

  // 증분 재생성: 파싱 → 꼬리 병합 → 배치 렌더 → 백그라운드 캐시(미캐시 꼬리만)
  async function incrementalRegenerate(newText) {
    overlayGenerationInFlight = true;
    const myToken = ++overlayGenerationToken;
    try {
      const result = parseContentSegments(newText);
      if (myToken !== overlayGenerationToken) return;
      if (!result || !Array.isArray(result.segments) || !result.segments.length) return;
      const oldSegs = overlaySegments;
      const newSegs = result.segments;
      const newHash = result.contentHash;
      // (text|speaker|kind) 튜플로 기존 세그먼트의 payloadId 매핑.
      // 중간 삽입/삭제로 인덱스가 밀려도 같은 대사면 동일 payloadId를 재사용하여
      // audioCache/overlayPlayedPayloadIds 보존 (✅ 유지, 백그라운드 중복 생성 방지).
      // 주의: payloadId는 contentHash+segmentIndex 기반이라 스트리밍 시 매번 새로 발급되지만,
      // audioCache 키(stableTtsCacheKey)는 튜플 기반이라 실제 음성은 캐시에 남아 있음.
      const oldByTuple = new Map();
      for (const os of oldSegs) {
        if (!os || !os.payloadId) continue;
        const tkey = (os.text || "") + "\u0001" + (os.speakerName || "") + "\u0001" + (os.segmentKind || "");
        if (!oldByTuple.has(tkey)) {
          oldByTuple.set(tkey, { payloadId: os.payloadId, wasCached: overlayPlayedPayloadIds.has(os.payloadId) });
        }
      }
      const reusedIds = new Set();
      let reusedCount = 0;
      for (const ns of newSegs) {
        const tkey = (ns.text || "") + "\u0001" + (ns.speakerName || "") + "\u0001" + (ns.segmentKind || "");
        const old = oldByTuple.get(tkey);
        if (old && !reusedIds.has(old.payloadId)) {
          reusedIds.add(old.payloadId);
          reusedCount += 1;
          // 새로 발급된 ns.payloadId는 버리고 예전 payloadId 재사용.
          // payload entry의 contentHash/segmentIndex를 새 값으로 갱신
          // (collectEmotionDirectorContext 등이 contentSegmentsByHash와 일관되게 조회).
          const oldPayload = payloads.get(old.payloadId);
          if (oldPayload) {
            oldPayload.contentHash = newHash;
            oldPayload.segmentIndex = ns.index;
          }
          // 새 id로 새로 만들어진 payload entry는 더 이상 참조되지 않으니 제거(누수 방지).
          if (ns.payloadId && ns.payloadId !== old.payloadId) {
            try { payloads.delete(ns.payloadId); } catch (e) {}
          }
          ns.payloadId = old.payloadId;
          if (old.wasCached) overlayPlayedPayloadIds.add(old.payloadId);
        }
      }
      overlaySegments = newSegs;
      overlaySelectedText = newText;
      overlaySelectedHash = newHash;
      await renderListPanel().catch(() => {});
      await renderTopPanel().catch(() => {});
      if (typeof globalThis.requestAnimationFrame === "function") {
        globalThis.requestAnimationFrame(() => { placeOverlayButtons().catch(() => {}); });
      } else {
        await placeOverlayButtons().catch(() => {});
      }
      startBackgroundCache();
      addOverlayLog("스트리밍 증분 갱신: " + reusedCount + "개 캐시 유지, " + (newSegs.length - reusedCount) + "개 갱신 (합 " + newSegs.length + ")");
    } finally {
      if (myToken === overlayGenerationToken) overlayGenerationInFlight = false;
    }
  }

  // --- 로그 토글 ---
  async function toggleOverlayCollapse() {
    if (!overlayMainPanel) return;
    overlayCollapsed = !overlayCollapsed;
    if (overlayCollapsed) {
      if (overlayTopButtonRow) await overlayTopButtonRow.setStyleAttribute("display:none;");
      if (overlayListHeader) await overlayListHeader.setStyleAttribute("display:none;");
      if (overlayListItems) await overlayListItems.setStyleAttribute("display:none;");
      if (overlayTopInfoRow) await overlayTopInfoRow.setStyleAttribute("padding:2px 10px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#1e1e24;border-bottom:1px solid #2e2e38;");
      if (overlayMainPanel) await overlayMainPanel.setStyleAttribute(mainPanelStyle("flex") + "max-height:28px;overflow:hidden;");
      clearOverlayButtons();
      if (overlayCollapseBtn) await overlayCollapseBtn.setStyleAttribute("cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:#93c5fd;border-radius:4px;font-size:14px;line-height:1;").catch(() => {});
      if (overlayCollapseBtn) await overlayCollapseBtn.setInnerHTML("+").catch(() => {});
      addOverlayLog("패널 접기");
    } else {
      if (overlayTopButtonRow) await overlayTopButtonRow.setStyleAttribute("padding:8px 12px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr) minmax(0,1fr);gap:3px;align-items:stretch;flex-shrink:0;");
      if (overlayListHeader) await overlayListHeader.setStyleAttribute("padding:6px 10px;font-size:11px;color:#94a3b8;border-bottom:1px solid #2e2e38;flex-shrink:0;display:block;");
      if (overlayListItems) await overlayListItems.setStyleAttribute("overflow-y:auto;flex:1;min-height:60px;max-height:280px;display:block;");
      if (overlayTopInfoRow) await overlayTopInfoRow.setStyleAttribute("padding:6px 12px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;border-bottom:1px solid #2e2e38;background:#1e1e24;");
      if (overlayMainPanel) await overlayMainPanel.setStyleAttribute(mainPanelStyle("flex"));
      if (overlayCollapseBtn) await overlayCollapseBtn.setStyleAttribute("cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:#64748b;border-radius:4px;font-size:14px;line-height:1;").catch(() => {});
      if (overlayCollapseBtn) await overlayCollapseBtn.setInnerHTML("&#9472;").catch(() => {});
      addOverlayLog("패널 펼치기");
      await placeOverlayButtons().catch(() => {});
    }
  }

  async function toggleOverlayLog() {
    overlayLogOpen = !overlayLogOpen;
    if (!overlayLogPanel) return;
    await overlayLogPanel.setStyleAttribute(logPanelStyle(overlayLogOpen ? "flex" : "none")).catch(() => {});
    if (overlayLogBtn) await overlayLogBtn.setInnerHTML((overlayLogOpen ? "로그&#10003;" : "로그")).catch(() => {});
    if (overlayLogOpen && overlayLogContent) {
      await overlayLogContent.setTextContent(overlayLogLines.join("\n")).catch(() => {});
    }
  }

  // --- 상단 패널 렌더 ---
  async function renderTopPanel() {
    if (!overlayHeaderLeft) return;
    const idxText = overlaySelectedIdx >= 0 ? "#" + (overlaySelectedIdx + 1) : "미선택";
    await overlayHeaderLeft.setInnerHTML(
      "<span style='font-size:12px;font-weight:700;color:#e3e3e6;'>RisuTTS</span>" +
      "<span style='font-size:11px;color:#64748b;'>메시지 " + idxText + "</span>"
    );
    if (overlayGenBtn) {
      await overlayGenBtn.setInnerHTML(
        "<span style='font-size:10px;'>&#10022;</span>" +
        "<span>생성</span>" +
        "<span style='font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(37,99,235,0.25);color:#60a5fa;font-weight:700;'>" + overlaySegments.length + "</span>"
      ).catch(() => {});
    }
  }

  // --- 리스트 패널 렌더 ---
  async function renderListPanel() {
    if (!overlayListHeader || !overlayListItems) return;
    let savedScrollTop = 0;
    try { savedScrollTop = await safeGetScrollTop(overlayListItems); } catch (e) {}
    savedScrollTop = savedScrollTop || 0;
    const displaySegs = getEffectiveSegments();
    await overlayListHeader.setTextContent("대사 항목 (" + displaySegs.length + ")" + (overlayDialogueOnly && displaySegs.length !== overlaySegments.length ? " / 전체 " + overlaySegments.length : ""));
    try { await overlayListItems.setInnerHTML(""); } catch (e) {}
    overlayListItemEls = [];
    if (!displaySegs.length) {
      const empty = await ovlMk("div", {
        style: "color:#64748b;font-size:12px;padding:12px;",
        text: overlaySegments.length ? "대사 항목이 없습니다. (대사만 켜짐)" : "대사 항목이 없습니다. 메시지를 선택하세요.",
      });
      await overlayListItems.appendChild(empty);
      return;
    }
    let html = "";
    const fullTexts = [];
    for (let i = 0; i < displaySegs.length; i++) {
      const seg = displaySegs[i];
      const speaker = seg.speakerName ? seg.speakerName + ": " : "";
      const preview = (seg.text || "").slice(0, 50).replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const titleRaw = speaker + (seg.text || "");
      const kindIcon = seg.segmentKind === "narration" ? "📝" : "💬";
      const cacheIcon = overlayPlayedPayloadIds.has(seg.payloadId) ? "✅" : "❌";
      const isCurrent = (i === overlayCycleIdx);
      const itemStyle = "padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:6px;cursor:pointer;" +
        (isCurrent ? "background:rgba(16,185,129,0.18);border-left:3px solid #10b981;" : "");
      html += "<div style=\"" + itemStyle + "\" data-rt-idx=\"" + i + "\" data-ovl-payload-id=\"" + htmlEscape(seg.payloadId) + "\" data-ovl-role=\"list-item\" title=\"" + htmlEscape(titleRaw) + "\">" +
        "<span style='font-size:14px;flex-shrink:0;'>" + kindIcon + "</span>" +
        "<span style='font-size:10px;flex-shrink:0;'>" + cacheIcon + "</span>" +
        "<span style='font-size:11px;color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;'>" + speaker + preview + "</span>" +
        "<span style='font-size:12px;color:#10b981;flex-shrink:0;'>▶</span>" +
        "</div>";
      fullTexts.push((speaker + (seg.text || "")).replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    }
    try { await overlayListItems.setInnerHTML(html); } catch (e) { overlayListItemEls = []; }
    if (!overlayListItemEls.length) {
      try {
        const items = await api.unwarpSafeArray(await overlayListItems.querySelectorAll("[data-rt-idx]"));
        for (let i = 0; i < items.length && i < displaySegs.length; i++) {
          overlayListItemEls.push({ el: items[i], idx: i, payloadId: displaySegs[i].payloadId, fullText: fullTexts[i], cached: overlayPlayedPayloadIds.has(displaySegs[i].payloadId) });
        }
      } catch (e) {
        overlayListItemEls = [];
      }
    }
    if (savedScrollTop > 0) {
      try { await safeSetScrollTop(overlayListItems, savedScrollTop); } catch (e) {}
      if (typeof globalThis.requestAnimationFrame === "function") {
        globalThis.requestAnimationFrame(() => {
          safeSetScrollTop(overlayListItems, savedScrollTop).catch(() => {});
        });
      }
    }
  }

  async function scrollListToIndex(idx) {
    if (idx == null || idx < 0) return false;
    // rootDoc(iframe) SafeElement 기반 — scrollIntoView 우선, setProperty 폴백
    try {
      const entry = overlayListItemEls[idx];
      if (!entry || !entry.el || !overlayListItems) return false;
      // 방법1: scrollIntoView (SafeElement가 프록시하면 작동, 컨테이너 중앙 정렬)
      try {
        if (typeof entry.el.scrollIntoView === "function") {
          entry.el.scrollIntoView({ block: "center", behavior: "auto" });
          addOverlayLog("리스트 스크롤(scrollIntoView): " + idx);
          return true;
        }
      } catch (e) {}
      // 방법2: setProperty("scrollTop") + getBoundingClientRect 로 오프셋 계산
      const listRect = await overlayListItems.getBoundingClientRect();
      const itemRect = await entry.el.getBoundingClientRect();
      if (listRect && itemRect && typeof overlayListItems.setProperty === "function") {
        const cur = await safeGetScrollTop(overlayListItems);
        const target = Math.max(0, cur + (itemRect.top - listRect.top) - (listRect.height / 2) + (itemRect.height / 2));
        const ok = await safeSetScrollTop(overlayListItems, target);
        addOverlayLog("리스트 스크롤(setProperty): " + idx + " ok=" + ok);
        return ok;
      }
    } catch (e) { addOverlayLog("리스트 스크롤 실패: " + (e && e.message ? e.message : e)); }
    return false;
  }

  async function updateListPanelLight() {
    if (!overlayListItemEls.length) return;
    const displaySegs = getEffectiveSegments();
    for (let i = 0; i < overlayListItemEls.length && i < displaySegs.length; i++) {
      const entry = overlayListItemEls[i];
      const seg = displaySegs[i];
      if (!entry.el) continue;
      const isCurrent = (i === overlayCycleIdx);
      const style = "padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:6px;cursor:pointer;" +
        (isCurrent ? "background:rgba(16,185,129,0.18);border-left:3px solid #10b981;" : "");
      try { await entry.el.setStyleAttribute(style); } catch (e) {}
      const cached = overlayPlayedPayloadIds.has(seg.payloadId);
      try {
        const kids = await api.unwarpSafeArray(await entry.el.getChildren());
        if (kids[1]) await kids[1].setTextContent(cached ? "✅" : "❌").catch(() => {});
      } catch (e) {}
      entry.cached = cached;
    }
  }

  async function scrollChatToSegment(payloadId) {
    if (!payloadId) return false;
    const payload = payloads.get(payloadId);
    if (!payload) return false;
    function normalizeForMatch(text) {
      return String(text || "")
        .replace(/[^a-zA-Z0-9\uac00-\ud7a3\u3040-\u30ff\u3400-\u9fff\uff00-\uffef\u4e00-\u9fff]/g, "")
        .toLowerCase();
    }
    const segKey = normalizeForMatch(payload.sourceText).slice(0, 30);
    if (!segKey || segKey.length < 3) return false;
    // rootDoc(iframe) SafeElement 기반 — overlayButtons childEl 우선 (정확한 세그먼트 위치)
    try {
      const ob = overlayButtons.find((b) => b.payloadId === payloadId);
      if (ob && ob.childEl) {
        try {
          if (typeof ob.childEl.scrollIntoView === "function") {
            ob.childEl.scrollIntoView({ block: "center", behavior: "auto" });
            addOverlayLog("채팅 스크롤(세그먼트): " + (payload.sourceText || "").slice(0, 20));
            return true;
          }
        } catch (e) {}
        // textRect 기반 컨테이너 scrollTop 계산 (폴백)
        if (ob.textRect) {
          const container = await findChatContainer();
          if (container) {
            const cRect = await container.getBoundingClientRect();
            if (cRect) {
              const textCenter = (ob.textRect.top + ob.textRect.bottom) / 2;
              const containerCenter = cRect.top + cRect.height / 2;
              const cur = await safeGetScrollTop(container);
              const target = Math.max(0, cur + (textCenter - containerCenter));
              const ok = await safeSetScrollTop(container, target);
              addOverlayLog("채팅 스크롤(textRect): ok=" + ok);
              return ok;
            }
          }
        }
      }
      const container = await findChatContainer();
      if (!container) { addOverlayLog("채팅 스크롤: 컨테이너 없음"); return false; }
      const msgs = await getMessageElements(container);
      if (!msgs || !msgs.length) { addOverlayLog("채팅 스크롤: 메시지 없음"); return false; }
      for (let i = 0; i < msgs.length; i++) {
        let txt = "";
        try { txt = await msgs[i].textContent() || ""; } catch (e) { continue; }
        if (!normalizeForMatch(txt).includes(segKey)) continue;
        // 메시지 내 자식 요소 중 세그먼트 텍스트가 있는 정확한 요소 탐색 (화면 밖 세그먼트 대응)
        let bestChild = null;
        let bestDiff = Infinity;
        try {
          const childEls = await api.unwarpSafeArray(await msgs[i].querySelectorAll("p, div, span, li, td, button"));
          for (const c of childEls) {
            let ct = "";
            try { ct = await c.textContent() || ""; } catch (e) { continue; }
            if (!ct) continue;
            const ck = normalizeForMatch(ct);
            if (!ck || ck.length < segKey.length) continue;
            if (ck.includes(segKey)) {
              const diff = ck.length - segKey.length;
              if (diff < bestDiff) { bestDiff = diff; bestChild = c; }
            }
          }
        } catch (e) {}
        const scrollTarget = bestChild || msgs[i];
        try {
          if (typeof scrollTarget.scrollIntoView === "function") {
            scrollTarget.scrollIntoView({ block: "center", behavior: "auto" });
            addOverlayLog("채팅 스크롤(" + (bestChild ? "자식" : "메시지") + "): " + (payload.sourceText || "").slice(0, 20));
            return true;
          }
        } catch (e) {}
        try {
          const cRect = await container.getBoundingClientRect();
          const tRect = await scrollTarget.getBoundingClientRect();
          if (cRect && tRect && typeof container.setProperty === "function") {
            const cur = await safeGetScrollTop(container);
            const target = Math.max(0, cur + (tRect.top - cRect.top) - (cRect.height / 2) + (tRect.height / 2));
            const ok = await safeSetScrollTop(container, target);
            addOverlayLog("채팅 스크롤(setProperty): ok=" + ok);
            return ok;
          }
        } catch (e) {}
        addOverlayLog("채팅 스크롤: 스크롤 메서드 없음");
        return false;
      }
      addOverlayLog("채팅 스크롤: 매치 없음");
    } catch (e) { addOverlayLog("채팅 스크롤 실패: " + (e && e.message ? e.message : e)); }
    return false;
  }

  // --- 생성 (파싱 → 리스트 + 오버레이 버튼) ---
  // --- 캐시 존재 여부 확인 (audioCache Map에서 직접 조회) ---
  async function checkSegmentCached(payload) {
    try {
      let textForTts = payload.sourceText;
      if (payload.mode === "ko" || payload.mode === "en") {
        const useGoogle = (config.translationMethod === "google");
        const trKey = useGoogle
          ? `${payload.mode}-ja:${hashText(payload.sourceText)}:google:google:google`
          : `${payload.mode}-ja:${hashText(payload.sourceText)}:${config.translationModel}:${config.translationEndpoint}:${hashText(config.translationPrompt || DEFAULT_TRANSLATION_PROMPT)}`;
        if (translationCache[trKey]) {
          textForTts = translationCache[trKey];
        } else {
          return false;
        }
      }
      const voiceContext = await resolveVoiceContext(payload);
      const audioKey = stableTtsCacheKey(textForTts, payload, voiceContext);
      return Boolean(audioCache.get(audioKey));
    } catch (e) {
      return false;
    }
  }

  async function generateSegments() {
    if (!overlaySelectedText) {
      await setOverlayToast("메시지를 먼저 선택하세요", "info");
      setTimeout(() => setOverlayToast("", "info"), 1500);
      return;
    }
    if (overlayGenerationInFlight) {
      addOverlayLog("generateSegments 스킵: 이미 생성 진행 중 (token=" + overlayGenerationToken + ")");
      return;
    }
    overlayGenerationInFlight = true;
    const myToken = ++overlayGenerationToken;
    try {
      await setOverlayToast("생성중...", "loading");
      try { await refreshCurrentCharacterSnapshot().catch(() => null); } catch (e) {}
      const result = parseContentSegments(overlaySelectedText);
      if (myToken !== overlayGenerationToken) {
        addOverlayLog("generateSegments 취소: 더 새 클릭이 들어옴");
        return;
      }
      if (!result || !result.segments.length) {
        await setOverlayToast("대사를 찾지 못했습니다", "info");
        setTimeout(() => setOverlayToast("", "info"), 1500);
        overlaySegments = [];
        overlaySelectedHash = "";
        clearOverlayButtons();
        await renderListPanel().catch(() => {});
        await renderTopPanel().catch(() => {});
        return;
      }
      overlaySegments = result.segments;
      overlaySelectedHash = result.contentHash;
      // 건너뛸 텍스트 필터 적용
      if (overlayConfig.skipTextFilter) {
        const terms = overlayConfig.skipTextFilter.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
        if (terms.length) {
          const before = overlaySegments.length;
          overlaySegments = overlaySegments.filter(seg => {
            const payload = payloads.get(seg.payloadId);
            if (!payload) return true;
            const text = (payload.sourceText || "").toLowerCase();
            return !terms.some(term => text.includes(term));
          });
          if (overlaySegments.length < before) {
            addOverlayLog("텍스트 필터로 " + (before - overlaySegments.length) + "개 항목 제거됨");
          }
        }
      }
      if (audioCache.size > 0) {
        addOverlayLog("캐시 확인 중.. (" + result.segments.length + "개)");
        const localVoiceCache = new Map();
        for (const seg of result.segments) {
          if (myToken !== overlayGenerationToken) {
            addOverlayLog("캐시 확인 중단: 슈퍼시드됨");
            return;
          }
          const payload = payloads.get(seg.payloadId);
          if (!payload) continue;
          const cached = await checkSegmentCachedWithCache(payload, localVoiceCache);
          if (cached) overlayPlayedPayloadIds.add(seg.payloadId);
        }
        addOverlayLog("캐시 확인 완료: " + result.segments.filter((s) => overlayPlayedPayloadIds.has(s.payloadId)).length + "/" + result.segments.length + " 캐시됨");
      } else {
        addOverlayLog("audioCache 비어 있음 — 캐시 확인 루프 스킵 (" + result.segments.length + "개)");
      }
      await renderListPanel().catch(() => {});
      await renderTopPanel().catch(() => {});
      await setOverlayToast(result.segments.length + "개 대사 생성됨", "info");
      setTimeout(() => setOverlayToast("", "info"), 1200);
      if (typeof globalThis.requestAnimationFrame === "function") {
        globalThis.requestAnimationFrame(() => {
          placeOverlayButtons().catch(() => {});
        });
      } else {
        await placeOverlayButtons().catch(() => {});
      }
      startBackgroundCache();
    } finally {
      if (myToken === overlayGenerationToken) {
        overlayGenerationInFlight = false;
      }
    }
  }

  async function checkSegmentCachedWithCache(payload, localVoiceCache) {
    try {
      let textForTts = payload.sourceText;
      if (payload.mode === "ko" || payload.mode === "en") {
        const useGoogle = (config.translationMethod === "google");
        const trKey = useGoogle
          ? `${payload.mode}-ja:${hashText(payload.sourceText)}:google:google:google`
          : `${payload.mode}-ja:${hashText(payload.sourceText)}:${config.translationModel}:${config.translationEndpoint}:${hashText(config.translationPrompt || DEFAULT_TRANSLATION_PROMPT)}`;
        if (translationCache[trKey]) {
          textForTts = translationCache[trKey];
        } else {
          return false;
        }
      }
      const speakerKey = String(payload.speakerName || "");
      let voiceContext = localVoiceCache.get(speakerKey);
      if (!voiceContext) {
        voiceContext = await resolveVoiceContext(payload);
        localVoiceCache.set(speakerKey, voiceContext);
      }
      const audioKey = stableTtsCacheKey(textForTts, payload, voiceContext);
      return Boolean(audioCache.get(audioKey));
    } catch (e) {
      return false;
    }
  }

  // --- 선택재생: 현재 선택 항목부터 끝까지 순차 재생 ---
  // --- 순차 재생: 오디오 끝날 때까지 대기 ---
  async function playSegmentSequential(payload) {
    let textForTts = payload.sourceText;
    if (payload.mode === "ko" || payload.mode === "en") {
      textForTts = await translateToJapanese(payload.sourceText, payload.mode);
    }
    return await synthesizeAndPlay(textForTts, payload, {
      shouldPlay: () => !overlayCycleCancelled,
      waitForEnd: true,
      onAudioState: (state) => {
        // 재생 시작 시 overlayConfig.speed를 직접 적용
        // (playAudioEntry의 overlayConfig 스코프 문제 회피)
        if (state === "playing" && currentAudio) {
          try { currentAudio.playbackRate = overlayConfig.speed; } catch (e) {}
          try { currentAudio.volume = overlayConfig.volume / 100; } catch (e) {}
          // 초록 재생중 표시(메시지 오버레이 박스 + 리스트 하이라이트 + 아이콘 + 토스트) 갱신
          updatePlayingHighlight(payload.payloadId).catch(() => {});
        }
      },
    });
  }

  // --- 하이라이트 갱신 (전체 리렌더 없이 스타일만 교체) ---
  // 선택 항목 메시지 초록 박스 재위치 (overlayButtons textRect 기반)
  async function redrawSelectedBox() {
    if (!overlayPlayingBox || !overlayOpen) return;
    try {
      const segs = getEffectiveSegments();
      const seg = segs[overlayCycleIdx];
      if (!seg || !seg.payloadId) { await overlayPlayingBox.setStyleAttribute("display:none;"); return; }
      const ob = overlayButtons.find((b) => b.payloadId === seg.payloadId);
      if (!ob || !ob.textRect) { await overlayPlayingBox.setStyleAttribute("display:none;"); return; }
      const tr = ob.textRect;
      const style = "position:fixed;z-index:99985;display:block;pointer-events:none;border-radius:4px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.45);border-left:3px solid rgba(16,185,129,0.7);left:" + (tr.left - 2) + "px;top:" + tr.top + "px;width:" + (tr.right - tr.left + 4) + "px;height:" + tr.height + "px;";
      await overlayPlayingBox.setStyleAttribute(style);
    } catch (e) {}
  }

  async function updateHighlight() {
    for (let i = 0; i < overlayListItemEls.length; i++) {
      const entry = overlayListItemEls[i];
      if (!entry.el) continue;
      const isCurrent = (i === overlayCycleIdx);
      const style = "padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:6px;cursor:pointer;" +
        (isCurrent ? "background:rgba(16,185,129,0.18);border-left:3px solid #10b981;" : "");
      try { await entry.el.setStyleAttribute(style).catch(() => {}); } catch (e) {}
    }
    // 메시지 초록 박스 (선택 추적 — 항상)
    redrawSelectedBox().catch(() => {});
    // 채팅 자동 스크롤 (선택 항목이 바뀔 때마다 — 선택재생 루프/수동 선택 모두 커버)
    if (overlayConfig.chatAutoScroll) {
      try {
        const segs = getEffectiveSegments();
        const seg = segs[overlayCycleIdx];
        if (seg && seg.payloadId) scrollChatToSegment(seg.payloadId).catch(() => {});
      } catch (e) {}
    }
  }

  // --- 통합 점프: 오버레이 버튼 / 리스트 항목 / elementFromPoint 폴백 공용 ---
  // 반환: true = 동기화 켜져 있어 처리함, false = 호출자가 기존(legacy) 동작 수행
  async function jumpToSegment(payloadId) {
    if (!overlayConfig.overlaySelectionSync) return false;
    if (!payloadId) return false;
    const segs = getEffectiveSegments();
    if (!segs.length) return false;
    const idx = segs.findIndex((s) => s && s.payloadId === payloadId);
    if (idx < 0) return false;
    if (overlayCycleRunning) {
      // 루프 유지 + 점프: handleButtonClick 재호출 X (겹침 방지)
      // runCycle이 jumpRequest를 확인해 idx로 점프 후 루프 계속
      overlayCycleIdx = idx;       // 즉시 초록 하이라이트 표시 (채팅 스크롤은 updateHighlight가 처리)
      overlayJumpRequest = idx;    // runCycle에게 점프 지시 (idx++ 방지)
      stopCurrentAudio();          // 현재 세그먼트 재생 중단 → waitForEnd 즉시 resolve
      await updateHighlight();
      addOverlayLog("점프(루프 유지): " + (idx + 1) + "/" + segs.length);
    } else {
      // 루프 미실행 → 해당 항목 1회 재생
      overlayCycleCompleted = false;
      overlayCycleIdx = idx;
      await updateHighlight();
      addOverlayLog("선택 재생: " + (idx + 1) + "/" + segs.length);
      await handleButtonClick(null, payloadId, { syncState: false });
    }
    return true;
  }

  // --- ⏯️ 선택 사이클 토글 ---
  async function togglePlayCycle() {
    if (overlayCycleRunning) {
      // 정지
      overlayCycleCancelled = true;
      stopCurrentAudio();
      overlayCycleRunning = false;
      if (overlayPlayFromBtn) await overlayPlayFromBtn.setInnerHTML("<span>&#9654;</span><span>선택 재생</span>").catch(() => {});
      addOverlayLog("사이클 정지");
      await setOverlayToast("", "info");
      return;
    }
    // 시작
    const segs = getEffectiveSegments();
    if (!segs.length) {
      await setOverlayToast("항목이 없습니다", "info");
      setTimeout(() => setOverlayToast("", "info"), 1500);
      return;
    }
    if (!overlayAudioPermissionGranted) {
      const granted = await requestAudioPermission();
      if (!granted) { await setOverlayToast("권한 미획득", "info"); setTimeout(() => setOverlayToast("", "info"), 2000); return; }
    }
    overlayCycleRunning = true;
    overlayCycleCancelled = false;
    if (overlayCycleCompleted) { overlayCycleIdx = 0; overlayCycleCompleted = false; addOverlayLog("사이클 재시작: 처음부터"); }
    if (overlayPlayFromBtn) await overlayPlayFromBtn.setInnerHTML("<span>&#9646;</span><span>정지</span>").catch(() => {});
    addOverlayLog("사이클 시작: " + (overlayCycleIdx + 1) + "번부터");
    await runCycle();
  }

  // --- 사이클 실행 ---
  async function runCycle() {
    const segs = getEffectiveSegments();
    if (!segs.length) { overlayCycleRunning = false; return; }
    while (!overlayCycleCancelled && overlayCycleIdx < segs.length) {
      const seg = segs[overlayCycleIdx];
      if (!seg || !seg.payloadId) { overlayCycleIdx++; continue; }
      const payload = payloads.get(seg.payloadId);
      if (!payload) { overlayCycleIdx++; continue; }
      addOverlayLog("사이클 " + (overlayCycleIdx + 1) + "/" + segs.length + ": " + (payload.sourceText || "").slice(0, 20));
      await updateHighlight();
      try {
        // 같은 항목이 이미 재생 중이면(수동 스피커 클릭 등 1회 재생) 처음부터 다시 틀지 않고
        // 현재 재생이 자연스럽게 끝날 때까지 대기한 뒤 다음 항목으로 넘어간다.
        if (isCurrentAudioPlayingForPayload(seg.payloadId)) {
          addOverlayLog("사이클 " + (overlayCycleIdx + 1) + ": 이미 재생 중 → 완료 대기(재시작 X)");
          const audioRef = currentAudio;
          if (audioRef) await waitForAudioEnd(audioRef).catch(() => {});
        } else {
          await playSegmentSequential(payload);
        }
        if (overlayCycleCancelled) break;
        overlayPlayedPayloadIds.add(seg.payloadId);
        const itemEntry = overlayListItemEls.find((e) => e.payloadId === seg.payloadId);
        if (itemEntry && itemEntry.el) {
          try {
            const kids = await api.unwarpSafeArray(await itemEntry.el.getChildren());
            if (kids[1]) await kids[1].setTextContent("✅").catch(() => {});
          } catch (e) {}
        }
      } catch (e) {
        addOverlayLog("사이클 재생 실패 " + (overlayCycleIdx + 1) + ": " + describeError(e));
      }
      // 점프 요청 체크 — ◀️▶️ 버튼/키보드로 인한 이동
      if (overlayJumpRequest >= 0) {
        overlayCycleIdx = overlayJumpRequest;
        overlayJumpRequest = -1;
        continue; // overlayCycleIdx++ 건너뛰고 점프 위치에서 재개
      }
      if (!overlayCycleCancelled) overlayCycleIdx++;
    }
    overlayCycleRunning = false;
    if (overlayPlayFromBtn) await overlayPlayFromBtn.setInnerHTML("<span>&#9654;</span><span>선택 재생</span>").catch(() => {});
    if (overlayCycleIdx >= segs.length) {
      overlayCycleIdx = segs.length - 1; // 완료 시 마지막 항목에 머무름 (맨 위로 돌아가지 않음)
      overlayCycleCompleted = true;
      addOverlayLog("사이클 완료 (마지막 항목 유지)");
    }
    await updateHighlight();
  }

  // --- ◀️ 이전 / ▶️ 다음 ---
  async function playPrevSegment() {
    const segs = getEffectiveSegments();
    if (!segs.length) return;
    if (overlayCycleRunning) {
      // 사이클 실행 중: jump request만 설정, runCycle이 처리
      if (overlayCycleIdx > 0) overlayJumpRequest = overlayCycleIdx - 1;
      stopCurrentAudio();
      addOverlayLog("이전 점프 요청: " + (overlayCycleIdx));
      return;
    }
    // 사이클 안 돌 중: 직접 재생
    overlayCycleCompleted = false;
    if (overlayCycleIdx > 0) overlayCycleIdx--;
    addOverlayLog("이전: " + (overlayCycleIdx + 1) + "/" + segs.length);
    await updateHighlight();
    const seg = segs[overlayCycleIdx];
    if (seg && seg.payloadId) {
      const payload = payloads.get(seg.payloadId);
      if (payload) {
        stopCurrentAudio();
        try { await playSegmentSequential(payload); } catch (e) {}
      }
    }
  }

  async function playNextSegment() {
    const segs = getEffectiveSegments();
    if (!segs.length) return;
    if (overlayCycleRunning) {
      // 사이클 실행 중: jump request만 설정, runCycle이 처리
      if (overlayCycleIdx < segs.length - 1) overlayJumpRequest = overlayCycleIdx + 1;
      stopCurrentAudio();
      addOverlayLog("다음 점프 요청: " + (overlayCycleIdx + 2));
      return;
    }
    // 사이클 안 돌 중: 직접 재생
    overlayCycleCompleted = false;
    if (overlayCycleIdx < segs.length - 1) overlayCycleIdx++;
    addOverlayLog("다음: " + (overlayCycleIdx + 1) + "/" + segs.length);
    await updateHighlight();
    const seg = segs[overlayCycleIdx];
    if (seg && seg.payloadId) {
      const payload = payloads.get(seg.payloadId);
      if (payload) {
        stopCurrentAudio();
        try { await playSegmentSequential(payload); } catch (e) {}
      }
    }
  }

  // --- 키보드 방향키 ---
  async function onOverlayKeyDown(e) {
    if (!overlayOpen) return;
    const key = String(e.key || e.code || "").toLowerCase();
    if (key === "control") {
      // Ctrl: 리스트 패널 중앙 스크롤 + 채팅 스크롤 (선택 항목으로)
      e.preventDefault?.();
      scrollListToIndex(overlayCycleIdx).catch(() => {});
      try {
        const segs = getEffectiveSegments();
        const seg = segs[overlayCycleIdx];
        if (seg && seg.payloadId) scrollChatToSegment(seg.payloadId).catch(() => {});
      } catch (err) {}
      return;
    }
    if (key === "arrowleft" || key === "left") {
      e.preventDefault?.();
      await playPrevSegment();
    } else if (key === "arrowright" || key === "right") {
      e.preventDefault?.();
      await playNextSegment();
    }
  }

  // --- 포인터 처리 ---
  // --- 클릭 활성화 헬퍼 (빠른 경로/rect 폴백 공유 — 중복 제거) ---
  async function activateListItem(item) {
    const now = Date.now();
    const isDouble = (now - overlayLastListItemClickTs < 400) && (overlayLastListItemClickPayloadId === item.payloadId);
    overlayLastListItemClickTs = now;
    overlayLastListItemClickPayloadId = item.payloadId || "";
    addOverlayLog("항목 클릭 idx=" + item.idx + " payloadId=" + (item.payloadId || "").slice(0, 24) + (isDouble ? " (더블)" : ""));
    if (isDouble && overlayConfig.doubleClickScrollToMessage) {
      addOverlayLog("더블클릭 → 채팅 스크롤");
      await setOverlayToast("채팅으로 스크롤...", "info");
      await scrollChatToSegment(item.payloadId).catch((err) => {
        addOverlayLog("채팅 스크롤 실패: " + describeError(err));
      });
      setTimeout(() => setOverlayToast("", "info"), 1000);
      return;
    }
    if (item.payloadId) {
      const payload = payloads.get(item.payloadId);
      if (!payload) {
        addOverlayLog("payload 못 찾음: " + item.payloadId);
        await setOverlayToast("payload 못 찾음", "info");
        setTimeout(() => setOverlayToast("", "info"), 1500);
        return;
      }
      if (!overlayAudioPermissionGranted) {
        await setOverlayToast("오디오 권한 요청 중...", "loading");
        const granted = await requestAudioPermission();
        if (!granted) { await setOverlayToast("권한 미획득", "info"); setTimeout(() => setOverlayToast("", "info"), 2000); return; }
      }
      addOverlayLog("재생 시작: mode=" + payload.mode + " text=" + (payload.sourceText || "").slice(0, 30));
      await setOverlayToast("생성중...", "loading");
      try {
        const handled = await jumpToSegment(item.payloadId);
        if (handled) return;
        if (overlayCycleRunning) {
          overlayCycleCancelled = true;
          stopCurrentAudio();
          overlayCycleRunning = false;
          if (overlayPlayFromBtn) await overlayPlayFromBtn.setInnerHTML("<span>&#9654;</span><span>선택 재생</span>").catch(() => {});
        }
        overlayCycleIdx = item.idx;
        await updateHighlight();
        await handleButtonClick(null, item.payloadId, { syncState: false });
      } catch (err) {
        addOverlayLog("재생 실패: " + describeError(err));
        await setOverlayToast("재생 실패", "info");
        setTimeout(() => setOverlayToast("", "info"), 2000);
      }
    }
  }

  async function activateSpeaker(payloadId) {
    if (!overlayAudioPermissionGranted) {
      await setOverlayToast("오디오 권한 요청 중...", "loading");
      const granted = await requestAudioPermission();
      if (!granted) return;
    }
    await setOverlayToast("생성중...", "loading");
    try {
      const handled = await jumpToSegment(payloadId);
      if (handled) return;
      if (overlayCycleRunning) {
        overlayCycleCancelled = true;
        stopCurrentAudio();
        overlayCycleRunning = false;
        if (overlayPlayFromBtn) await overlayPlayFromBtn.setInnerHTML("<span>&#9654;</span><span>선택 재생</span>").catch(() => {});
      }
      await handleButtonClick(null, payloadId, { syncState: false });
    } catch (err) {
      addOverlayLog("재생 실패: " + describeError(err));
      await setOverlayToast("재생 실패", "info");
      setTimeout(() => setOverlayToast("", "info"), 2000);
    }
  }

  async function onOverlayDown(e) {
    const x = e.clientX, y = e.clientY;
    // 1) FAB
    if (overlayFab) {
      let r;
      try { r = await overlayFab.getBoundingClientRect(); } catch (err) { r = null; }
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        if (overlayOpen) await closeOverlay();
        else await openOverlay();
        return;
      }
    }
    if (!overlayOpen) return;
    // 1.5) 배속 팝업 처리
    if (overlaySpeedPopup) {
      let pRect;
      try { pRect = await overlaySpeedPopup.getBoundingClientRect(); } catch (e) { pRect = null; }
      if (pRect && pRect.width > 0) {
        for (const entry of overlaySpeedItems) {
          let cr;
          try { cr = await entry.el.getBoundingClientRect(); } catch (e) { continue; }
          if (cr && x >= cr.left && x <= cr.right && y >= cr.top && y <= cr.bottom) {
            const speedVal = entry.speed;
            overlayConfig.speed = speedVal;
            if (overlaySpeedBtn) {
              await overlaySpeedBtn.setInnerHTML(
                "<span>" + speedVal + "x</span>" +
                "<span style='font-size:8px;color:#64748b;'>&#9660;</span>"
              ).catch(() => {});
            }
            if (currentAudio) {
              try { currentAudio.playbackRate = speedVal; } catch (e) {}
            }
            addOverlayLog("배속 변경: " + speedVal + "x");
            await saveOverlayConfig();
            await overlaySpeedPopup.setStyleAttribute("display:none;");
            return;
          }
        }
        let bRect;
        try { bRect = await overlaySpeedBtn.getBoundingClientRect(); } catch (e) { bRect = null; }
        const isOnBtn = bRect && x >= bRect.left && x <= bRect.right && y >= bRect.top && y <= bRect.bottom;
        if (!isOnBtn) {
          await overlaySpeedPopup.setStyleAttribute("display:none;");
        }
      }
    }
    // 2) 버튼들 (생성/전체재생/⏯️선택/◀️/▶️/배속/대사만/초기화/스크롤/로그)
    const topBtns = [overlayGenBtn, overlayReadAllBtn, overlayPlayFromBtn, overlayPrevBtn, overlayNextBtn, overlaySpeedBtn, overlayDialogueOnlyBtn, overlayClearBtn, overlayChatScrollBtn, overlayLogBtn, overlayCollapseBtn];
    const topActions = [
      function() { return generateSegments(); },
      function() {
        if (!overlaySelectedHash) return;
        if (overlayCycleRunning) {
          // 이미 선택재생 중이면 맨 위(첫 항목)로 점프 후 루프 계속
          // (재시작 X → 기존 runCycle과 새 runCycle이 동시에 도는 중복 실행 방지)
          overlayCycleIdx = 0;
          overlayJumpRequest = 0;
          stopCurrentAudio();
          updateHighlight().catch(() => {});
          addOverlayLog("전체 재생: 맨 위로 점프(루프 유지)");
          return;
        }
        overlayCycleIdx = 0;
        overlayCycleCancelled = false;
        return togglePlayCycle();
      },
      function() { return togglePlayCycle(); },
      function() { return playPrevSegment(); },
      function() { return playNextSegment(); },
      function() { return toggleSpeed(); },
      function() { return toggleDialogueOnly(); },
      function() { overlaySegments = []; overlaySelectedHash = ""; overlayPlayedPayloadIds.clear(); clearOverlayButtons(); overlayCycleRunning = false; overlayCycleCancelled = true; overlayCycleCompleted = false; overlayCycleIdx = 0; renderListPanel().catch(() => {}); renderTopPanel().catch(() => {}); },
      function() {
        overlayConfig.chatAutoScroll = !overlayConfig.chatAutoScroll;
        saveOverlayConfig().catch(() => {});
        if (overlayChatScrollBtn) overlayChatScrollBtn.setTextContent(overlayConfig.chatAutoScroll ? "스크롤✓" : "스크롤").catch(() => {});
        addOverlayLog("채팅 자동 스크롤 " + (overlayConfig.chatAutoScroll ? "ON" : "OFF"));
        return Promise.resolve();
      },
      function() { return toggleOverlayLog(); },
      function() { return toggleOverlayCollapse(); },
    ];
    // 상단 버튼에 1회 role 태깅 (elementFromPoint 빠른 경로용)
    if (!overlayTopRolesApplied) {
      overlayTopRolesApplied = true;
      for (let _ri = 0; _ri < topBtns.length && _ri < TOP_BTN_ROLES.length; _ri++) {
        if (topBtns[_ri]) { try { await topBtns[_ri].setAttribute("data-ovl-role", TOP_BTN_ROLES[_ri]); } catch (e) {} }
      }
    }
    // 3) 빠른 경로: elementFromPoint 1회 + 조상 탐색으로 O(1) 타겟팅
    let _efpWorked = false;
    try {
      let target = null;
      if (rootDoc && typeof rootDoc.elementFromPoint === "function") {
        target = await rootDoc.elementFromPoint(x, y);
      }
      if (target) {
        _efpWorked = true;
        for (let depth = 0; target && depth < 8; depth += 1) {
          let isClose = "";
          try { isClose = await target.getAttribute("data-ovl-log-close").catch(() => ""); } catch (err) {}
          if (isClose === "1") { if (overlayLogOpen) await toggleOverlayLog(); return; }
          let role = "";
          try { role = await target.getAttribute("data-ovl-role").catch(() => ""); } catch (err) {}
          if (role) {
            const roleIdx = TOP_BTN_ROLES.indexOf(role);
            if (roleIdx >= 0 && topActions[roleIdx]) {
              await topActions[roleIdx]();
              return;
            }
          }
          let pid = "";
          try { pid = await target.getAttribute("data-ovl-payload-id").catch(() => ""); } catch (err) {}
          if (pid) {
            let listItem = null;
            for (const it of overlayListItemEls) { if (it.payloadId === pid) { listItem = it; break; } }
            if (listItem) { await activateListItem(listItem); }
            else { await activateSpeaker(pid); }
            return;
          }
          try { target = typeof target.getParent === "function" ? await target.getParent() : null; } catch (err) { target = null; }
        }
        // elementFromPoint는 작동했으나 오버레이 타겟 아님 → 배경 클릭, rect 루프 스킵
        return;
      }
    } catch (err) {}
    // 4) 폴백: elementFromPoint 미지원/실패 시 기존 rect 히트테스트 (SafeElement/iframe 대비)
    if (!_efpWorked) {
      for (let i = 0; i < topBtns.length; i++) {
        if (!topBtns[i]) continue;
        let r;
        try { r = await topBtns[i].getBoundingClientRect(); } catch (err) { continue; }
        if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          await topActions[i]();
          return;
        }
      }
      for (const item of overlayListItemEls) {
        let r;
        try { r = await item.el.getBoundingClientRect(); } catch (err) { continue; }
        if (!r || !r.width) continue;
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          await activateListItem(item);
          return;
        }
      }
      for (const ob of overlayButtons) {
        let r;
        try { r = await ob.el.getBoundingClientRect(); } catch (err) { continue; }
        if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          await activateSpeaker(ob.payloadId);
          return;
        }
      }
    }
    // 메시지 선택 + 재배치는 pointerup(onOverlayPointerUp)에서 단일 수행.
    // (이전: pointerdown + pointerup 양쪽에서 이중 스캔 → 클릭 1회 = 4회 풀스캔)
  }

  // --- 열기/닫기 ---
  async function openOverlay() {
    overlayOpen = true;
    invalidateChatDomCaches();
    if (overlayFab) await overlayFab.setInnerHTML("✕").catch(() => {});
    addOverlayLog("openOverlay: 보이스 초기화 시작");
    try { await loadConfig(); } catch (e) { addOverlayLog("loadConfig 실패 " + describeError(e)); }
    try { await refreshCurrentCharacterSnapshot(); addOverlayLog("캐릭터 id=" + lastKnownCharacterId); } catch (e) {}
    try {
      if (!hasLocalVoiceExplorerData()) {
        const store = await getStorage();
        await loadSharedVoiceMetadataFromHelper(store).catch(() => {});
      }
    } catch (e) {}
    if (overlayMainPanel) await overlayMainPanel.setStyleAttribute(mainPanelStyle("flex")).catch(() => {});
    await setOverlayToast("오버레이 모드 ON", "info");
    setTimeout(() => setOverlayToast("", "info"), 1200);
    // 백그라운드 캐시 시작 (설정 켜져 있고 항목이 있으면)
    if (overlaySegments.length > 0) startBackgroundCache();
    startStreamPolling();
    startCacheTick();
  }

  async function closeOverlay() {
    overlayOpen = false;
    invalidateChatDomCaches();
    if (startBackgroundCacheTimer) { clearTimeout(startBackgroundCacheTimer); startBackgroundCacheTimer = null; }
    overlayCycleCancelled = true;
    overlayCycleRunning = false;
    stopCurrentAudio();
    if (overlayFab) await overlayFab.setInnerHTML("🔊").catch(() => {});
    if (overlayMainPanel) await overlayMainPanel.setStyleAttribute(mainPanelStyle("none")).catch(() => {});
    if (overlaySpeedPopup) await overlaySpeedPopup.setStyleAttribute("display:none;").catch(() => {});
    if (overlayLogOpen) { overlayLogOpen = false; if (overlayLogPanel) await overlayLogPanel.setStyleAttribute(logPanelStyle("none")).catch(() => {}); }
    clearOverlayButtons();
    stopStreamPolling();
    stopCacheTick();
    await setOverlayToast("", "info");
  }

  // --- 오버레이 초기화 ---
  async function setupOverlay() {
    try {
      if (typeof api.getRootDocument !== "function") {
        console.log("[RisuTTS] getRootDocument 미지원");
        return false;
      }
      rootDoc = await api.getRootDocument();
      if (!rootDoc) { console.log("[RisuTTS] rootDoc 권한 필요"); return false; }
      await loadOverlayConfig();
      // 기존 루트 제거
      try {
        const stale = await api.unwarpSafeArray(await rootDoc.querySelectorAll("." + OVERLAY_ROOT_CLS));
        for (const el of stale) { try { await el.remove(); } catch (e) {} }
      } catch (e) {}
      const body = await rootDoc.querySelector("body");
      if (!body) { console.log("[RisuTTS] body 미발견"); return false; }

      // 루트
      overlayRoot = await ovlMk("div", {
        className: OVERLAY_ROOT_CLS,
        style: "position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;",
      });
      await body.appendChild(overlayRoot);

      // 스피너 애니메이션 CSS 주입
      try {
        const spinStyle = await ovlMk("style", {
          html: "@keyframes risutts-spin{to{transform:rotate(360deg)}}@keyframes risutts-pulse{0%,100%{opacity:1}50%{opacity:0.4}}",
        });
        await overlayRoot.appendChild(spinStyle);
      } catch (e) {}

      // FAB
      overlayFab = await ovlMk("div", { style: fabStyle(), html: "🔊" });
      await overlayRoot.appendChild(overlayFab);

      // 통합 메인 패널
      overlayMainPanel = await ovlMk("div", { style: mainPanelStyle("none") });
      // 헤더 행
      overlayTopInfoRow = await ovlMk("div", {
        style: "padding:6px 12px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;border-bottom:1px solid #2e2e38;background:#1e1e24;cursor:default;",
      });
      overlayHeaderLeft = await ovlMk("div", {
        style: "display:flex;align-items:center;gap:8px;",
      });
      const headerRight = await ovlMk("div", {
        style: "display:flex;align-items:center;gap:4px;",
      });
      overlayChatScrollBtn = await ovlMk("span", {
        style: "cursor:pointer;font-size:10px;color:#94a3b8;padding:2px 8px;border-radius:4px;background:#22222a;border:1px solid #2e2e38;font-weight:500;white-space:nowrap;",
        text: overlayConfig.chatAutoScroll ? "스크롤✓" : "스크롤",
      });
      overlayLogBtn = await ovlMk("span", {
        style: "cursor:pointer;font-size:10px;color:#94a3b8;padding:2px 8px;border-radius:4px;background:#22222a;border:1px solid #2e2e38;font-weight:500;white-space:nowrap;",
        text: "로그",
      });
      overlayCollapseBtn = await ovlMk("span", {
        style: "cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:#64748b;border-radius:4px;font-size:14px;line-height:1;",
        html: "&#9472;",
      });
      try { await overlayCollapseBtn.setAttribute("data-ovl-collapse", "1"); } catch (e) {}
      await headerRight.appendChild(overlayChatScrollBtn);
      await headerRight.appendChild(overlayLogBtn);
      await headerRight.appendChild(overlayCollapseBtn);
      await overlayTopInfoRow.appendChild(overlayHeaderLeft);
      await overlayTopInfoRow.appendChild(headerRight);
      // 버튼 행 - 3열 그리드
      overlayTopButtonRow = await ovlMk("div", {
        style: "padding:8px 12px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr) minmax(0,1fr);gap:3px;align-items:stretch;flex-shrink:0;",
      });
      // 좌측 열: 생성 + 필터 (세로 스택)
      const topLeftCol = await ovlMk("div", { style: "display:flex;flex-direction:column;gap:2px;width:100%;" });
      overlayGenBtn = await ovlMk("span", {
        style: "cursor:pointer;background:#22222a;color:#e3e3e6;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:500;white-space:nowrap;border:1px solid #2e2e38;display:flex;align-items:center;gap:6px;width:100%;box-sizing:border-box;",
      });
      overlayDialogueOnlyBtn = await ovlMk("span", {
        style: "cursor:pointer;background:#22222a;color:#e3e3e6;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:500;white-space:nowrap;border:1px solid #2e2e38;display:flex;align-items:center;justify-content:center;gap:6px;width:100%;box-sizing:border-box;",
      });
      // 중앙 열: 통합 플레이어 그리드
      const topCenterCol = await ovlMk("div", {
        style: "display:grid;grid-template-columns:32px 1fr 32px;gap:2px;align-items:center;",
      });
      const centerMidCol = await ovlMk("div", {
        style: "display:flex;flex-direction:column;gap:2px;",
      });
      overlayPrevBtn = await ovlMk("span", {
        style: "cursor:pointer;background:#22222a;color:#94a3b8;border:1px solid #2e2e38;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;white-space:nowrap;min-height:60px;padding:6px 4px;box-sizing:border-box;",
        html: "&#9664;<span style='font-size:8px;color:#64748b;margin-top:2px;display:block;'>이전</span>",
      });
      overlayReadAllBtn = await ovlMk("span", {
        style: "cursor:pointer;background:#2563eb;color:#fff;font-weight:700;font-size:11px;padding:5px 10px;border-radius:6px;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:4px;",
      });
      overlayPlayFromBtn = await ovlMk("span", {
        style: "cursor:pointer;background:#22222a;color:#60a5fa;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap;border:1px solid rgba(59,130,246,0.3);display:flex;align-items:center;justify-content:center;gap:4px;padding:5px 10px;",
      });
      overlayNextBtn = await ovlMk("span", {
        style: "cursor:pointer;background:#22222a;color:#94a3b8;border:1px solid #2e2e38;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;white-space:nowrap;min-height:60px;padding:6px 4px;box-sizing:border-box;",
        html: "&#9654;<span style='font-size:8px;color:#64748b;margin-top:2px;display:block;'>다음</span>",
      });
      // 우측 열: 배속 + 초기화 (세로 스택)
      const topRightCol = await ovlMk("div", { style: "display:flex;flex-direction:column;gap:2px;width:100%;" });
      overlaySpeedBtn = await ovlMk("span", {
        style: "cursor:pointer;background:#22222a;color:#e3e3e6;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:500;white-space:nowrap;border:1px solid #2e2e38;display:flex;align-items:center;justify-content:center;gap:6px;width:100%;box-sizing:border-box;",
      });
      overlayClearBtn = await ovlMk("span", {
        style: "cursor:pointer;background:#22222a;color:#e3e3e6;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:500;white-space:nowrap;border:1px solid #2e2e38;display:flex;align-items:center;gap:6px;width:100%;box-sizing:border-box;",
      });
      // 초기 콘텐츠 설정
      await overlayGenBtn.setInnerHTML(
        "<span style='font-size:10px;'>&#10022;</span>" +
        "<span>생성</span>" +
        "<span style='font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(37,99,235,0.25);color:#60a5fa;font-weight:700;'>0</span>"
      ).catch(() => {});
      await overlayDialogueOnlyBtn.setInnerHTML(
        "<span>대사만</span>" +
        "<span style='width:6px;height:6px;border-radius:50%;background:#64748b;display:inline-block;'></span>"
      ).catch(() => {});
      await overlayReadAllBtn.setInnerHTML(
        "<span>&#9654;</span><span>전체 재생</span>"
      ).catch(() => {});
      await overlayPlayFromBtn.setInnerHTML(
        "<span>&#9654;</span><span>선택 재생</span>"
      ).catch(() => {});
      const speedText = String(overlayConfig.speed || "1").replace(/\.(\d)$/, ".$1x").replace(/^(\d+)$/, "$1.0x");
      await overlaySpeedBtn.setInnerHTML(
        "<span>" + speedText + "</span>" +
        "<span style='font-size:8px;color:#64748b;'>&#9660;</span>"
      ).catch(() => {});
      overlaySpeedPopup = await ovlMk("div", {
        style: "position:fixed;z-index:99999;display:none;flex-direction:column;gap:2px;padding:4px;background:#1e1e24;border:1px solid #2e2e38;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.5);min-width:80px;"
      });
      await overlayRoot.appendChild(overlaySpeedPopup);
      await overlayClearBtn.setInnerHTML(
        "<span style='font-size:10px;'>&#8635;</span><span>초기화</span>"
      ).catch(() => {});
      // 좌측 열: 생성 + 필터
      await topLeftCol.appendChild(overlayGenBtn);
      await topLeftCol.appendChild(overlayDialogueOnlyBtn);
      // 중앙 열: 이전 | 전체재생+선택재생 | 다음
      await topCenterCol.appendChild(overlayPrevBtn);
      await centerMidCol.appendChild(overlayReadAllBtn);
      await centerMidCol.appendChild(overlayPlayFromBtn);
      await topCenterCol.appendChild(centerMidCol);
      await topCenterCol.appendChild(overlayNextBtn);
      // 우측 열: 배속 + 초기화
      await topRightCol.appendChild(overlaySpeedBtn);
      await topRightCol.appendChild(overlayClearBtn);
      // 그리드에 열 추가
      await overlayTopButtonRow.appendChild(topLeftCol);
      await overlayTopButtonRow.appendChild(topCenterCol);
      await overlayTopButtonRow.appendChild(topRightCol);
      // 구분선 + 리스트
      const divider = await ovlMk("div", {
        style: "height:1px;background:#2e2e38;flex-shrink:0;",
      });
      overlayListHeader = await ovlMk("div", {
        style: "padding:6px 10px;font-size:11px;color:#94a3b8;border-bottom:1px solid #2e2e38;flex-shrink:0;",
        text: "대사 항목 (0)",
      });
      overlayListItems = await ovlMk("div", {
        className: "rt-ovl-list",
        style: "overflow-y:auto;flex:1;min-height:60px;max-height:280px;",
      });
      // 패널 조립
      await overlayMainPanel.appendChild(overlayTopInfoRow);
      await overlayMainPanel.appendChild(overlayTopButtonRow);
      await overlayMainPanel.appendChild(divider);
      await overlayMainPanel.appendChild(overlayListHeader);
      await overlayMainPanel.appendChild(overlayListItems);
      await overlayRoot.appendChild(overlayMainPanel);

      // 오버레이 버튼 층
      overlayLayer = await ovlMk("div", {
        style: "position:fixed;left:0;top:0;width:0;height:0;z-index:99989;pointer-events:none;",
      });
      await overlayRoot.appendChild(overlayLayer);

      overlayHoverBox = await ovlMk("div", {
        style: "position:fixed;z-index:99986;display:none;pointer-events:none;border-radius:4px;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);transition:opacity 80ms ease;",
      });
      await overlayRoot.appendChild(overlayHoverBox);

      // 선택 항목 메시지 초록 박스 (선택 추적 — 재생 여부 무관 항상 표시)
      overlayPlayingBox = await ovlMk("div", {
        style: "position:fixed;z-index:99985;display:none;pointer-events:none;border-radius:4px;",
      });
      await overlayRoot.appendChild(overlayPlayingBox);

      // 토스트
      overlayToast = await ovlMk("div", {
        style: "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;background:rgba(37,99,235,0.95);color:#fff;padding:8px 16px;border-radius:8px;font-family:sans-serif;font-size:13px;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.4);",
      });
      await overlayRoot.appendChild(overlayToast);

      // 로그 패널
      overlayLogPanel = await ovlMk("div", { style: logPanelStyle("none") });
      const logHeader = await ovlMk("div", {
        style: "padding:6px 10px;font-size:11px;color:#64748b;border-bottom:1px solid #2e2e38;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;",
        html: "<span>RisuTTS 로그</span>",
      });
      const logCloseBtn = await ovlMk("span", { style: "cursor:pointer;color:#ef4444;font-size:13px;", text: "✕" });
      try { await logCloseBtn.setAttribute("data-ovl-log-close", "1"); } catch (e) {}
      await logHeader.appendChild(logCloseBtn);
      overlayLogContent = await ovlMk("div", {
        style: "padding:8px 10px;font-size:11px;line-height:1.4;overflow-y:auto;flex:1;min-height:0;white-space:pre-wrap;word-break:break-all;",
        text: "",
      });
      await overlayLogPanel.appendChild(logHeader);
      await overlayLogPanel.appendChild(overlayLogContent);
      await overlayRoot.appendChild(overlayLogPanel);

      // 초기 렌더
      await renderTopPanel();
      await renderListPanel();

      // 리스너 등록
      try { await rootDoc.addEventListener("pointerdown", onOverlayDown); } catch (e) {}
      try { await rootDoc.addEventListener("pointerup", onOverlayPointerUp); } catch (e) {}
      try { await rootDoc.addEventListener("pointermove", onOverlayPointerMove); } catch (e) {}
      try { await rootDoc.addEventListener("keydown", onOverlayKeyDown); } catch (e) {}
      try { await body.addEventListener("scroll", onOverlayScroll, { capture: true, passive: true }); } catch (e) {}

      console.log("[RisuTTS] 오버레이 시스템 초기화 완료");
      return true;
    } catch (error) {
      console.log("[RisuTTS] 오버레이 초기화 실패: " + describeError(error));
      return false;
    }
  }

  await setupOverlay();
  console.log("[RisuTTS] Plugin initialized (오버레이 모드).");
})();
