package eu.budbuddy.app.widget;

/** Widget copy, picked by settings.language (not the system locale). */
final class Texts {

    private Texts() {}

    static String t(boolean cs, String en, String czech) {
        return cs ? czech : en;
    }

    static String stage(boolean cs, String id) {
        switch (id) {
            case "germination": return t(cs, "Germination", "Klíčení");
            case "vegetative": return t(cs, "Vegetative", "Vegetace");
            case "flowering": return t(cs, "Flowering", "Kvetení");
            case "drying": return t(cs, "Drying", "Sušení");
            case "curing": return t(cs, "Curing", "Zrání");
            default: return t(cs, "Seedling", "Sazenice");
        }
    }

    static int stageColor(String id) {
        switch (id) {
            case "germination": return 0xffe9d68f;
            case "vegetative": return 0xff9be36b;
            case "flowering": return 0xffc9a2ff;
            case "drying": return 0xffd9a76a;
            case "curing": return 0xfff0b95e;
            default: return 0xffc8f08f;
        }
    }

    static String days(boolean cs, int n) {
        if (!cs) return n + (n == 1 ? " day" : " days");
        if (n == 1) return n + " den";
        if (n >= 2 && n <= 4) return n + " dny";
        return n + " dní";
    }

    static String stageDay(boolean cs, String stage, int day) {
        return stage(cs, stage) + " · " + t(cs, "day ", "den ") + day;
    }

    static String water(boolean cs, int dueIn) {
        if (dueIn < 0) return t(cs, "Water " + days(false, -dueIn) + " late", "Zalít " + days(true, -dueIn) + " po termínu");
        if (dueIn == 0) return t(cs, "Water today", "Zalít dnes");
        if (dueIn == 1) return t(cs, "Water tomorrow", "Zalít zítra");
        return t(cs, "Water in " + days(false, dueIn), "Zalít za " + days(true, dueIn));
    }
}
